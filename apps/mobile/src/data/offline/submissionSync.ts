import { getNetworkStateAsync } from 'expo-network';

import { getApi, type AppApi } from '../api';
import { hasBackendIdentity, offlineUserId, useSessionStore } from '../session';
import {
  classifySyncFailure,
  getAnswerSyncService,
  SYNC_RETRY_BASE_MS,
  syncRetryDelay,
  type AnswerSyncService,
} from './answerSync';
import { getOfflineDatabase, type OfflineDatabase } from './database';
import { getDurableAttemptService } from './durableAttempts';
import {
  createOfflineRepositories,
  type LocalAttempt,
  type UserScope,
} from './repositories';

type SubmissionApi = Pick<AppApi, 'getAttempt' | 'submitAttempt' | 'createAttempt'>;
type AnswerFlusher = Pick<AnswerSyncService, 'flushAttempt'>;
type TimerHandle = ReturnType<typeof setTimeout>;

export type SubmittedAttempt = {
  localAttemptId: string;
  serverAttemptId: string;
  testId: string;
  resultId: string;
};

export type SubmissionSyncSummary = {
  completed: SubmittedAttempt[];
  pending: number;
  failed: number;
  permanentFailures: number;
  /** Durable, user-safe diagnostic label for the failure that needs attention. */
  failureReason?: string;
  skipped: number;
  pausedForAuth: boolean;
  offline: boolean;
};

export type SubmissionSyncOptions = {
  now?: () => number;
  isOnline?: () => Promise<boolean>;
  canProcess?: (scope: UserScope) => boolean;
  /**
   * Whether the current session may drive a backend write (a real server user id + token),
   * never the phone-only offline fallback. Gates server-attempt creation only.
   */
  isAuthenticated?: (scope: UserScope) => boolean;
  schedule?: (task: () => void, delayMs: number) => TimerHandle;
  cancelSchedule?: (handle: TimerHandle) => void;
};

const emptySummary = (): SubmissionSyncSummary => ({
  completed: [],
  pending: 0,
  failed: 0,
  permanentFailures: 0,
  skipped: 0,
  pausedForAuth: false,
  offline: false,
});

function addSummary(target: SubmissionSyncSummary, next: SubmissionSyncSummary): void {
  target.completed.push(...next.completed);
  target.pending += next.pending;
  target.failed += next.failed;
  target.permanentFailures += next.permanentFailures;
  target.failureReason ??= next.failureReason;
  target.skipped += next.skipped;
  target.pausedForAuth ||= next.pausedForAuth;
  target.offline ||= next.offline;
}

/**
 * Foreground submission coordinator. Submission intent and every transition are durable.
 * A `submitting` row is always reconciled with GET before another non-idempotent POST.
 */
export class SubmissionSyncService {
  private readonly inFlight = new Map<string, Promise<SubmissionSyncSummary>>();
  private readonly rerunRequested = new Set<string>();
  private readonly retryTimers = new Map<string, TimerHandle>();
  private readonly now: () => number;
  private readonly isOnline: () => Promise<boolean>;
  private readonly canProcess: (scope: UserScope) => boolean;
  private readonly isAuthenticated: (scope: UserScope) => boolean;
  private readonly schedule: (task: () => void, delayMs: number) => TimerHandle;
  private readonly cancelSchedule: (handle: TimerHandle) => void;

  constructor(
    private readonly database: OfflineDatabase,
    private readonly api: SubmissionApi,
    private readonly answers: AnswerFlusher,
    options: SubmissionSyncOptions = {},
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
    this.isAuthenticated =
      options.isAuthenticated ??
      ((scope) => {
        const session = useSessionStore.getState();
        return hasBackendIdentity(session) && offlineUserId(session) === scope.userId;
      });
    this.schedule = options.schedule ?? ((task, delayMs) => setTimeout(task, delayMs));
    this.cancelSchedule = options.cancelSchedule ?? clearTimeout;
  }

  async requestSubmission(
    scope: UserScope,
    localAttemptId: string,
    auto = false,
  ): Promise<SubmissionSyncSummary> {
    const repositories = createOfflineRepositories(this.database);
    const existing = await repositories.attempts.get(scope, localAttemptId);
    if (__DEV__ && process.env.NODE_ENV !== 'test') {
      try {
        const [outbox, localAnswers] = await Promise.all([
          repositories.outbox.list(scope),
          repositories.answers.list(scope, localAttemptId),
        ]);
        console.info('[submission-sync] manual submission request', {
          localAttemptId,
          userScope: scope.userId,
          sqliteStatus: existing?.status ?? 'missing',
          hasServerAttemptId: Boolean(existing?.serverAttemptId),
          serverAttemptId: existing?.serverAttemptId ?? null,
          answerOutboxCount: outbox.filter(
            (entry) =>
              entry.attemptId === localAttemptId && entry.operation === 'patch_answer',
          ).length,
          dirtyAnswerCount: localAnswers.filter((answer) => answer.syncState === 'dirty')
            .length,
          submissionLastError: existing?.submissionLastError ?? null,
          submissionNextAttemptAt: existing?.submissionNextAttemptAt ?? null,
        });
      } catch (error) {
        console.info('[submission-sync] diagnostic read failed', {
          localAttemptId,
          userScope: scope.userId,
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
    if (!existing) throw new Error('Cannot submit a missing local attempt');
    if (existing.resultId && (existing.status === 'submitted' || existing.status === 'auto_submitted')) {
      return {
        ...emptySummary(),
        completed: [this.completed(existing, existing.resultId)],
      };
    }
    if (existing.status === 'pending_submit') {
      const retriedAt = this.now();
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        const retryRepositories = createOfflineRepositories(transaction);
        await retryRepositories.outbox.makeTemporaryFailuresDueForAttempt(
          scope,
          localAttemptId,
          retriedAt,
        );
        await retryRepositories.attempts.makeTemporarySubmissionRetryDue(
          scope,
          localAttemptId,
          retriedAt,
        );
      });
    }
    const requested = await repositories.attempts.requestSubmission(
      scope,
      localAttemptId,
      this.now(),
      auto,
    );
    if (!requested) {
      const current = await repositories.attempts.get(scope, localAttemptId);
      if (current?.status === 'sync_failed') {
        return {
          ...emptySummary(),
          failed: 1,
          permanentFailures: 1,
          failureReason: current.submissionLastError ?? 'permanent:submission_failed',
        };
      }
      throw new Error('Attempt is not eligible for submission');
    }
    return this.syncNow(scope);
  }

  syncNow(scope: UserScope): Promise<SubmissionSyncSummary> {
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

  async resumeAfterAuthentication(scope: UserScope): Promise<SubmissionSyncSummary> {
    if (!this.canProcess(scope)) return emptySummary();
    await this.inFlight.get(scope.userId)?.catch(() => undefined);
    await createOfflineRepositories(this.database).attempts.resumeSubmissionAuthFailures(
      scope,
      this.now(),
    );
    return this.syncNow(scope);
  }

  dispose(): void {
    for (const handle of this.retryTimers.values()) this.cancelSchedule(handle);
    this.retryTimers.clear();
  }

  private completed(attempt: LocalAttempt, resultId: string): SubmittedAttempt {
    if (!attempt.serverAttemptId) throw new Error('Submitted attempt lacks a server id');
    return {
      localAttemptId: attempt.id,
      serverAttemptId: attempt.serverAttemptId,
      testId: attempt.testId,
      resultId,
    };
  }

  private clearRetry(scope: UserScope): void {
    const timer = this.retryTimers.get(scope.userId);
    if (timer !== undefined) this.cancelSchedule(timer);
    this.retryTimers.delete(scope.userId);
  }

  private async scheduleNextRetry(scope: UserScope): Promise<void> {
    this.clearRetry(scope);
    if (!this.canProcess(scope)) return;
    const next = await createOfflineRepositories(this.database).attempts.nextSubmissionRetryAt(
      scope,
    );
    if (next === undefined) return;
    const delay = Math.max(SYNC_RETRY_BASE_MS, next - this.now());
    const handle = this.schedule(() => {
      this.retryTimers.delete(scope.userId);
      void this.syncNow(scope).catch(() => undefined);
    }, delay);
    this.retryTimers.set(scope.userId, handle);
  }

  private async defer(
    scope: UserScope,
    attempt: LocalAttempt,
    error: string,
    keepSubmitting: boolean,
    increment = true,
  ): Promise<void> {
    const count = attempt.submissionAttemptCount + (increment ? 1 : 0);
    await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
      status: keepSubmitting ? 'submitting' : 'pending_submit',
      submissionAttemptCount: count,
      submissionNextAttemptAt: this.now() + syncRetryDelay(count),
      submissionLastError: error,
      updatedAt: this.now(),
    });
  }

  private async failPermanently(
    scope: UserScope,
    attempt: LocalAttempt,
    error: string,
  ): Promise<void> {
    await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
      status: 'sync_failed',
      submissionNextAttemptAt: undefined,
      submissionLastError: error,
      updatedAt: this.now(),
    });
  }

  private async pauseForAuth(scope: UserScope, attempt: LocalAttempt): Promise<void> {
    await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
      submissionNextAttemptAt: undefined,
      submissionLastError: 'auth:401',
      updatedAt: this.now(),
    });
  }

  /**
   * Backfills the server attempt for an offline-created row before any answer or submit call.
   *
   * Creation is allowed only for a real authenticated backend user — never the phone-only
   * offline fallback — so a degraded session leaves the row blocked and visible rather than
   * silently creating an orphan under the wrong identity. The local attempt id is the durable
   * idempotency key: a retry after a crash or an ambiguous network failure returns the same
   * server attempt, so the non-idempotent POST can never be duplicated. Returns the refreshed
   * attempt on success, or `undefined` when it blocked, deferred or failed (summary updated).
   */
  private async ensureServerAttempt(
    scope: UserScope,
    attempt: LocalAttempt,
    summary: SubmissionSyncSummary,
  ): Promise<LocalAttempt | undefined> {
    if (!this.isAuthenticated(scope)) {
      await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
        submissionLastError: 'blocked:needs_authenticated_user',
        submissionNextAttemptAt: undefined,
        updatedAt: this.now(),
      });
      summary.skipped += 1;
      summary.pending += 1;
      return undefined;
    }
    try {
      const created = await this.api.createAttempt({
        test_id: attempt.testId,
        client_attempt_id: attempt.id,
      });
      await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
        serverAttemptId: created.id,
        submissionNextAttemptAt: undefined,
        submissionLastError: undefined,
        updatedAt: this.now(),
      });
      return await createOfflineRepositories(this.database).attempts.get(scope, attempt.id);
    } catch (error) {
      const kind = classifySyncFailure(error);
      if (kind.auth) {
        await this.pauseForAuth(scope, attempt);
        summary.pausedForAuth = true;
        summary.pending += 1;
      } else if (kind.retry) {
        // Idempotent create, so a later retry of an ambiguous POST cannot duplicate the attempt.
        await this.defer(scope, attempt, kind.label, false);
        summary.failed += 1;
        summary.pending += 1;
      } else {
        await this.failPermanently(scope, attempt, kind.label);
        summary.failed += 1;
        summary.permanentFailures += 1;
        summary.failureReason = kind.label;
      }
      return undefined;
    }
  }

  private async reconcileSubmitting(
    scope: UserScope,
    attempt: LocalAttempt,
    summary: SubmissionSyncSummary,
  ): Promise<LocalAttempt | undefined> {
    if (!attempt.serverAttemptId) {
      await this.failPermanently(scope, attempt, 'blocked:no_server_attempt');
      summary.skipped += 1;
      return undefined;
    }
    try {
      const server = await this.api.getAttempt(attempt.serverAttemptId);
      if (server.status !== 'in_progress') {
        // The current API confirms acceptance but provides no result_id lookup. Reposting is
        // unsafe because submit is not idempotent, so preserve the row for manual recovery.
        await this.failPermanently(
          scope,
          attempt,
          'permanent:submitted_result_id_unavailable',
        );
        summary.failed += 1;
        summary.permanentFailures += 1;
        summary.failureReason = 'permanent:submitted_result_id_unavailable';
        return undefined;
      }
      await createOfflineRepositories(this.database).attempts.update(scope, attempt.id, {
        status: 'pending_submit',
        submissionNextAttemptAt: undefined,
        submissionLastError: undefined,
        updatedAt: this.now(),
      });
      return await createOfflineRepositories(this.database).attempts.get(scope, attempt.id);
    } catch (error) {
      const kind = classifySyncFailure(error);
      if (kind.auth) {
        await this.pauseForAuth(scope, attempt);
        summary.pausedForAuth = true;
      } else if (kind.retry) {
        await this.defer(scope, attempt, kind.label, true);
      } else {
        await this.failPermanently(scope, attempt, kind.label);
        summary.permanentFailures += 1;
        summary.failureReason = kind.label;
      }
      summary.failed += 1;
      return undefined;
    }
  }

  private async process(scope: UserScope): Promise<SubmissionSyncSummary> {
    const summary = emptySummary();
    this.clearRetry(scope);
    if (!this.canProcess(scope)) return summary;
    if (!(await this.isOnline().catch(() => false))) {
      summary.offline = true;
      summary.pending = (
        await createOfflineRepositories(this.database).attempts.listPendingSubmissions(scope)
      ).length;
      return summary;
    }

    const repositories = createOfflineRepositories(this.database);
    const attempts = await repositories.attempts.listPendingSubmissions(scope);
    for (const original of attempts) {
      if (!this.canProcess(scope)) break;
      if (
        original.submissionLastError?.startsWith('auth:') ||
        (original.submissionNextAttemptAt !== undefined &&
          original.submissionNextAttemptAt > this.now())
      ) {
        summary.pending += 1;
        continue;
      }
      // An offline-created attempt has no server id yet: create it (idempotently) before any
      // answer or submit call, rather than dead-ending. Blocks a phone-only session.
      const ready = original.serverAttemptId
        ? original
        : await this.ensureServerAttempt(scope, original, summary);
      if (!ready) {
        if (summary.pausedForAuth) break;
        continue;
      }
      if (ready.resultId) {
        await repositories.attempts.update(scope, ready.id, {
          status: ready.submissionAuto ? 'auto_submitted' : 'submitted',
          submissionCompletedAt: this.now(),
          submissionNextAttemptAt: undefined,
          submissionLastError: undefined,
          updatedAt: this.now(),
        });
        summary.completed.push(this.completed(ready, ready.resultId));
        continue;
      }

      const attempt =
        ready.status === 'submitting'
          ? await this.reconcileSubmitting(scope, ready, summary)
          : ready;
      if (!attempt) {
        if (summary.pausedForAuth) break;
        continue;
      }
      const serverAttemptId = attempt.serverAttemptId;
      if (!serverAttemptId) {
        summary.skipped += 1;
        summary.pending += 1;
        continue;
      }

      const answersReady = await this.answers.flushAttempt(scope, attempt.id);
      const [queued, dirty] = await Promise.all([
        repositories.outbox.hasForAttempt(scope, attempt.id),
        repositories.answers.hasDirtyForAttempt(scope, attempt.id),
      ]);
      if (!answersReady || queued || dirty) {
        if (await repositories.outbox.hasAuthFailure(scope)) {
          await this.pauseForAuth(scope, attempt);
          summary.pausedForAuth = true;
          summary.pending += 1;
          break;
        }
        if (await repositories.outbox.hasPermanentFailureForAttempt(scope, attempt.id)) {
          await this.failPermanently(scope, attempt, 'blocked:answer_sync_permanent');
          summary.failed += 1;
          summary.permanentFailures += 1;
          summary.failureReason = 'blocked:answer_sync_permanent';
          continue;
        }
        const answerRetryAt = await repositories.outbox.nextRetryAtForAttempt(
          scope,
          attempt.id,
        );
        await repositories.attempts.update(scope, attempt.id, {
          submissionNextAttemptAt: answerRetryAt ?? this.now() + SYNC_RETRY_BASE_MS,
          submissionLastError: 'waiting:answers_unsynchronized',
          updatedAt: this.now(),
        });
        summary.pending += 1;
        continue;
      }

      const claimed = await repositories.attempts.claimSubmission(scope, attempt.id, this.now());
      if (!claimed) {
        summary.pending += 1;
        continue;
      }
      const claimedAttempt = await repositories.attempts.get(scope, attempt.id);
      if (!claimedAttempt) continue;
      try {
        const response = await this.api.submitAttempt(serverAttemptId);
        const completedAt = this.now();
        await repositories.attempts.update(scope, attempt.id, {
          status: attempt.submissionAuto ? 'auto_submitted' : 'submitted',
          resultId: response.result_id,
          submissionCompletedAt: completedAt,
          submissionNextAttemptAt: undefined,
          submissionLastError: undefined,
          updatedAt: completedAt,
        });
        summary.completed.push(this.completed(attempt, response.result_id));
      } catch (error) {
        const kind = classifySyncFailure(error);
        if (kind.auth) {
          // A received 401 is an explicit rejection, so it is safe to return to pending.
          await repositories.attempts.update(scope, attempt.id, {
            status: 'pending_submit',
            submissionNextAttemptAt: undefined,
            submissionLastError: kind.label,
            updatedAt: this.now(),
          });
          summary.pausedForAuth = true;
        } else if (kind.retry) {
          // The POST outcome may be ambiguous. Keep `submitting`; the next run performs GET.
          await this.defer(scope, claimedAttempt, kind.label, true, false);
        } else {
          await this.failPermanently(scope, claimedAttempt, kind.label);
          summary.permanentFailures += 1;
          summary.failureReason = kind.label;
        }
        summary.failed += 1;
        if (kind.auth) break;
      }
    }

    await this.scheduleNextRetry(scope);
    return summary;
  }
}

let submissionSyncServicePromise: Promise<SubmissionSyncService> | undefined;

export function getSubmissionSyncService(): Promise<SubmissionSyncService> {
  if (!submissionSyncServicePromise) {
    submissionSyncServicePromise = Promise.all([
      getOfflineDatabase(),
      getAnswerSyncService(),
    ]).then(([database, answers]) => new SubmissionSyncService(database, getApi(), answers));
  }
  return submissionSyncServicePromise;
}

export async function requestSubmissionSyncForCurrentUser(
  resumeAuthentication = false,
): Promise<SubmissionSyncSummary | undefined> {
  const session = useSessionStore.getState();
  const userId = offlineUserId(session);
  if (!userId || !session.token) return undefined;
  const service = await getSubmissionSyncService();
  return resumeAuthentication
    ? service.resumeAfterAuthentication({ userId })
    : service.syncNow({ userId });
}

export async function requestCurrentAttemptSubmission(
  localAttemptId: string,
  auto = false,
): Promise<SubmissionSyncSummary | undefined> {
  const session = useSessionStore.getState();
  const userId = offlineUserId(session);
  if (!userId || !session.token) return undefined;
  const scope = { userId };
  await (await getDurableAttemptService()).flushWrites(scope, localAttemptId);
  return (await getSubmissionSyncService()).requestSubmission(scope, localAttemptId, auto);
}

export function resetSubmissionSyncServiceForTests(): void {
  void submissionSyncServicePromise?.then((service) => service.dispose()).catch(() => undefined);
  submissionSyncServicePromise = undefined;
}
