import { getNetworkStateAsync } from 'expo-network';

import { ApiError, getApi, type AppApi } from '../api';
import { offlineUserId, useSessionStore } from '../session';
import { getOfflineDatabase, type OfflineDatabase } from './database';
import {
  createOfflineRepositories,
  type AnswerOutboxPayload,
  type LocalAnswer,
  type OutboxEntry,
  type UserScope,
} from './repositories';

export const SYNC_RETRY_BASE_MS = 2_000;
export const SYNC_RETRY_MAX_MS = 5 * 60_000;
const BATCH_LIMIT = 100;

type AnswerApi = Pick<AppApi, 'patchAttemptAnswer'>;
type TimerHandle = ReturnType<typeof setTimeout>;

export type AnswerSyncSummary = {
  synced: number;
  failed: number;
  skipped: number;
  pausedForAuth: boolean;
  offline: boolean;
};

export type AnswerSyncOptions = {
  now?: () => number;
  isOnline?: () => Promise<boolean>;
  canProcess?: (scope: UserScope) => boolean;
  schedule?: (task: () => void, delayMs: number) => TimerHandle;
  cancelSchedule?: (handle: TimerHandle) => void;
};

const emptySummary = (): AnswerSyncSummary => ({
  synced: 0,
  failed: 0,
  skipped: 0,
  pausedForAuth: false,
  offline: false,
});

function addSummary(target: AnswerSyncSummary, next: AnswerSyncSummary): void {
  target.synced += next.synced;
  target.failed += next.failed;
  target.skipped += next.skipped;
  target.pausedForAuth ||= next.pausedForAuth;
  target.offline ||= next.offline;
}

function isAnswerPayload(value: unknown, entry: OutboxEntry): value is AnswerOutboxPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<AnswerOutboxPayload>;
  return (
    payload.question_id === entry.entityKey &&
    (payload.choice === null ||
      (typeof payload.choice === 'number' &&
        Number.isInteger(payload.choice) &&
        payload.choice >= 0 &&
        payload.choice <= 3)) &&
    typeof payload.marked === 'boolean' &&
    payload.revision === entry.revision
  );
}

export function syncRetryDelay(attemptCount: number): number {
  return Math.min(
    SYNC_RETRY_BASE_MS * 2 ** Math.max(0, attemptCount - 1),
    SYNC_RETRY_MAX_MS,
  );
}

export function classifySyncFailure(error: unknown): {
  auth: boolean;
  retry: boolean;
  label: string;
} {
  if (error instanceof ApiError) {
    if (error.status === 401) return { auth: true, retry: false, label: 'auth:401' };
    const retry =
      error.status === 0 ||
      error.status === 408 ||
      error.status === 425 ||
      error.status === 429 ||
      error.status >= 500;
    return {
      auth: false,
      retry,
      label: `${retry ? 'temporary' : 'permanent'}:${error.status}:${error.code}`,
    };
  }
  return { auth: false, retry: true, label: 'temporary:unknown' };
}

/**
 * Foreground answer uploader. It never creates attempts, submits attempts, or touches results.
 * One in-flight chain per user preserves client ordering even though the backend has no revision API.
 */
export class AnswerSyncService {
  private readonly inFlight = new Map<string, Promise<AnswerSyncSummary>>();
  private readonly rerunRequested = new Set<string>();
  private readonly retryTimers = new Map<string, TimerHandle>();
  private readonly now: () => number;
  private readonly isOnline: () => Promise<boolean>;
  private readonly canProcess: (scope: UserScope) => boolean;
  private readonly schedule: (task: () => void, delayMs: number) => TimerHandle;
  private readonly cancelSchedule: (handle: TimerHandle) => void;

  constructor(
    private readonly database: OfflineDatabase,
    private readonly api: AnswerApi,
    options: AnswerSyncOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.isOnline =
      options.isOnline ??
      (async () => {
        const state = await getNetworkStateAsync();
        return state.isConnected !== false;
      });
    this.canProcess =
      options.canProcess ??
      ((scope) => {
        const session = useSessionStore.getState();
        return Boolean(session.token) && offlineUserId(session) === scope.userId;
      });
    this.schedule = options.schedule ?? ((task, delayMs) => setTimeout(task, delayMs));
    this.cancelSchedule = options.cancelSchedule ?? clearTimeout;
  }

  syncNow(scope: UserScope): Promise<AnswerSyncSummary> {
    const active = this.inFlight.get(scope.userId);
    if (active) {
      this.rerunRequested.add(scope.userId);
      return active;
    }
    const run = (async () => {
      const total = emptySummary();
      do {
        this.rerunRequested.delete(scope.userId);
        addSummary(total, await this.process(scope));
      } while (this.rerunRequested.has(scope.userId) && this.canProcess(scope));
      return total;
    })().finally(() => {
      if (this.inFlight.get(scope.userId) === run) this.inFlight.delete(scope.userId);
    });
    this.inFlight.set(scope.userId, run);
    return run;
  }

  /** Only a login/session change may release operations paused by a previous 401. */
  async resumeAfterAuthentication(scope: UserScope): Promise<AnswerSyncSummary> {
    if (!this.canProcess(scope)) return emptySummary();
    await this.inFlight.get(scope.userId)?.catch(() => undefined);
    await createOfflineRepositories(this.database).outbox.resumeAuthFailures(scope, this.now());
    return this.syncNow(scope);
  }

  /** Flushes answers only; callers may use the boolean to guard their existing submit path. */
  async flushAttempt(scope: UserScope, attemptId: string): Promise<boolean> {
    await this.syncNow(scope);
    const repositories = createOfflineRepositories(this.database);
    const [queued, dirty] = await Promise.all([
      repositories.outbox.hasForAttempt(scope, attemptId),
      repositories.answers.hasDirtyForAttempt(scope, attemptId),
    ]);
    return !queued && !dirty;
  }

  dispose(): void {
    for (const handle of this.retryTimers.values()) this.cancelSchedule(handle);
    this.retryTimers.clear();
  }

  private clearRetry(scope: UserScope): void {
    const timer = this.retryTimers.get(scope.userId);
    if (timer !== undefined) this.cancelSchedule(timer);
    this.retryTimers.delete(scope.userId);
  }

  private async repairMissingOutbox(scope: UserScope): Promise<void> {
    const repositories = createOfflineRepositories(this.database);
    const [dirty, queued] = await Promise.all([
      repositories.answers.listDirty(scope),
      repositories.outbox.list(scope),
    ]);
    const byEntity = new Map(
      queued
        .filter((entry) => entry.operation === 'patch_answer')
        .map((entry) => [`${entry.attemptId}\u0000${entry.entityKey}`, entry]),
    );
    for (const answer of dirty) {
      const existing = byEntity.get(`${answer.attemptId}\u0000${answer.questionId}`);
      if (existing && existing.revision >= answer.revision) continue;
      await repositories.outbox.put(this.answerEntry(answer));
    }
  }

  private answerEntry(answer: LocalAnswer): OutboxEntry<AnswerOutboxPayload> {
    const payload: AnswerOutboxPayload = {
      question_id: answer.questionId,
      choice: answer.choice,
      marked: answer.marked,
      revision: answer.revision,
    };
    return {
      userId: answer.userId,
      id: `answer:${answer.attemptId}:${answer.questionId}`,
      attemptId: answer.attemptId,
      operation: 'patch_answer',
      entityKey: answer.questionId,
      revision: answer.revision,
      payload,
      status: 'pending',
      attemptCount: 0,
      createdAt: answer.updatedAt,
      updatedAt: answer.updatedAt,
    };
  }

  private async scheduleNextRetry(scope: UserScope): Promise<void> {
    this.clearRetry(scope);
    if (!this.canProcess(scope)) return;
    const next = await createOfflineRepositories(this.database).outbox.nextRetryAt(scope);
    if (next === undefined) return;
    const delay = Math.max(SYNC_RETRY_BASE_MS, next - this.now());
    const handle = this.schedule(() => {
      this.retryTimers.delete(scope.userId);
      void this.syncNow(scope).catch(() => undefined);
    }, delay);
    this.retryTimers.set(scope.userId, handle);
  }

  private async process(scope: UserScope): Promise<AnswerSyncSummary> {
    const summary = emptySummary();
    this.clearRetry(scope);
    if (!this.canProcess(scope)) return summary;
    if (!(await this.isOnline().catch(() => false))) {
      summary.offline = true;
      return summary;
    }

    const repositories = createOfflineRepositories(this.database);
    await repositories.outbox.resetInterrupted(scope, this.now());
    await this.repairMissingOutbox(scope);
    if (await repositories.outbox.hasAuthFailure(scope)) {
      summary.pausedForAuth = true;
      return summary;
    }
    const entries = await repositories.outbox.listDue<AnswerOutboxPayload>(
      scope,
      this.now(),
      BATCH_LIMIT,
    );

    for (const entry of entries) {
      if (!this.canProcess(scope)) break;
      const attempt = await repositories.attempts.get(scope, entry.attemptId);
      if (!attempt?.serverAttemptId) {
        summary.skipped += 1;
        continue;
      }
      if (!isAnswerPayload(entry.payload, entry)) {
        await repositories.outbox.markFailed(scope, entry.id, entry.revision, {
          attemptCount: entry.attemptCount + 1,
          lastError: 'permanent:invalid_answer_payload',
          updatedAt: this.now(),
        });
        summary.failed += 1;
        continue;
      }
      const claimed = await repositories.outbox.markProcessing(
        scope,
        entry.id,
        entry.revision,
        this.now(),
      );
      if (!claimed) continue;

      try {
        await this.api.patchAttemptAnswer(attempt.serverAttemptId, {
          question_id: entry.payload.question_id,
          choice: entry.payload.choice,
          marked: entry.payload.marked,
        });
        await this.database.withExclusiveTransactionAsync(async (transaction) => {
          const tx = createOfflineRepositories(transaction);
          await tx.outbox.deleteIfRevision(scope, entry.id, entry.revision);
          await tx.answers.markCleanIfRevision(
            scope,
            entry.attemptId,
            entry.entityKey,
            entry.revision,
            this.now(),
          );
        });
        summary.synced += 1;
      } catch (error) {
        const kind = classifySyncFailure(error);
        const attemptCount = entry.attemptCount + 1;
        if (kind.auth) {
          await repositories.outbox.pauseForAuth(scope, this.now());
        } else {
          await repositories.outbox.markFailed(scope, entry.id, entry.revision, {
            attemptCount,
            nextAttemptAt: kind.retry ? this.now() + syncRetryDelay(attemptCount) : undefined,
            lastError: kind.label,
            updatedAt: this.now(),
          });
        }
        summary.failed += 1;
        if (kind.auth) {
          summary.pausedForAuth = true;
          break;
        }
      }
    }

    await this.scheduleNextRetry(scope);
    return summary;
  }
}

let answerSyncServicePromise: Promise<AnswerSyncService> | undefined;

export function getAnswerSyncService(): Promise<AnswerSyncService> {
  if (!answerSyncServicePromise) {
    answerSyncServicePromise = getOfflineDatabase().then(
      (database) => new AnswerSyncService(database, getApi()),
    );
  }
  return answerSyncServicePromise;
}

export async function requestAnswerSyncForCurrentUser(
  resumeAuthentication = false,
): Promise<AnswerSyncSummary | undefined> {
  const session = useSessionStore.getState();
  const userId = offlineUserId(session);
  if (!userId || !session.token) return undefined;
  const service = await getAnswerSyncService();
  return resumeAuthentication
    ? service.resumeAfterAuthentication({ userId })
    : service.syncNow({ userId });
}

export async function flushCurrentAttemptAnswers(localAttemptId: string): Promise<boolean> {
  const session = useSessionStore.getState();
  const userId = offlineUserId(session);
  if (!userId || !session.token) return false;
  return (await getAnswerSyncService()).flushAttempt({ userId }, localAttemptId);
}

export function resetAnswerSyncServiceForTests(): void {
  void answerSyncServicePromise?.then((service) => service.dispose()).catch(() => undefined);
  answerSyncServicePromise = undefined;
}
