import type { TestMeta } from '@tslprb/fixtures';

import type { PaperQuestion } from '../api';
import type { AttemptState, Choice } from '../attempt';
import { getOfflineDatabase, type OfflineDatabase } from './database';
import { getPublicReadCache, resolveCachedRead, type PublicReadCache } from './readCache';
import {
  createOfflineRepositories,
  type AnswerOutboxPayload,
  type LocalAnswer,
  type LocalAttempt,
  type LocalAttemptStatus,
  type UserScope,
} from './repositories';

export type RestoredAttempt = {
  attempt: LocalAttempt;
  answers: LocalAnswer[];
  meta: TestMeta;
  paper: PaperQuestion[];
};

export type CreateDurableAttemptInput = {
  scope: UserScope;
  test: TestMeta;
  paper: PaperQuestion[];
  serverAttemptId?: string;
  startedAt?: number;
  endsAt?: number;
};

export type SaveProgressInput = {
  scope: UserScope;
  attemptId: string;
  currentQuestion: number;
  currentQuestionId: string;
  currentEnteredAt?: number;
  sectionUnlocked: boolean[];
  choice: Choice | null;
  marked: boolean;
  visited: boolean;
  /** False for navigation-only persistence; answer/mark changes always leave an outbox row. */
  queueAnswerSync?: boolean;
};

export type AdoptAttemptInput = {
  scope: UserScope;
  test: TestMeta;
  paper: PaperQuestion[];
  state: AttemptState;
};

type PaperCache = Pick<PublicReadCache, 'readTestBundle'>;
type IdFactory = (testId: string, now: number) => string;

let idSequence = 0;
const defaultIdFactory: IdFactory = (testId, now) => {
  idSequence += 1;
  return `local-${testId}-${now.toString(36)}-${idSequence.toString(36)}`;
};

function initialUnlocks(test: TestMeta): boolean[] {
  return test.pattern.sections.map((section) => section.unlockAfter === undefined);
}

/**
 * Durable mobile-only attempt storage. Answer and navigation state are committed together;
 * answer changes also coalesce a `patch_answer` outbox row in that same transaction.
 * This service never calls an attempt, answer, submit or result endpoint itself.
 */
export class DurableAttemptService {
  private readonly writeChains = new Map<string, Promise<void>>();

  constructor(
    private readonly database: OfflineDatabase,
    private readonly paperCache: PaperCache,
    private readonly now: () => number = Date.now,
    private readonly idFactory: IdFactory = defaultIdFactory,
  ) {}

  async create(input: CreateDurableAttemptInput): Promise<LocalAttempt> {
    const firstQuestion = input.paper[0];
    if (!firstQuestion) throw new Error('A durable attempt requires a cached public paper');
    if (new Set(input.paper.map((question) => question.id)).size !== input.paper.length) {
      throw new Error('A durable attempt requires stable, unique question ids');
    }

    const startedAt = input.startedAt ?? this.now();
    const updatedAt = this.now();
    const attempt: LocalAttempt = {
      userId: input.scope.userId,
      id: this.idFactory(input.test.id, updatedAt),
      testId: input.test.id,
      serverAttemptId: input.serverAttemptId,
      startedAt,
      endsAt:
        input.endsAt ?? startedAt + input.test.pattern.durationMinutes * 60_000,
      status: 'running',
      currentQuestion: 1,
      currentQuestionId: firstQuestion.id,
      currentEnteredAt: startedAt,
      sectionUnlocked: initialUnlocks(input.test),
      submissionAttemptCount: 0,
      submissionAuto: false,
      createdAt: updatedAt,
      updatedAt,
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repositories = createOfflineRepositories(transaction);
      await repositories.attempts.insert(attempt);
      await repositories.answers.put({
        userId: input.scope.userId,
        attemptId: attempt.id,
        questionId: firstQuestion.id,
        questionNo: 1,
        choice: null,
        marked: false,
        visited: true,
        revision: 0,
        syncState: 'clean',
        updatedAt,
      });
    });
    return attempt;
  }

  /** One-time upgrade path for a running Zustand attempt created before Phase 3. */
  async adopt(input: AdoptAttemptInput): Promise<LocalAttempt> {
    const { state } = input;
    if (
      state.status !== 'running' ||
      !state.attemptId ||
      !state.endsAt ||
      state.testId !== input.test.id
    ) {
      throw new Error('Only a complete running attempt can be adopted');
    }
    const currentQuestion = Math.min(
      Math.max(1, state.current),
      input.test.pattern.totalQuestions,
    );
    const currentQuestionId = input.paper[currentQuestion - 1]?.id;
    if (!currentQuestionId) throw new Error('The cached paper cannot restore this attempt');
    const updatedAt = this.now();
    const localId = state.attemptId.startsWith('local-')
      ? state.attemptId
      : this.idFactory(input.test.id, updatedAt);
    const attempt: LocalAttempt = {
      userId: input.scope.userId,
      id: localId,
      testId: input.test.id,
      serverAttemptId:
        state.serverAttemptId ??
        (state.attemptId.startsWith('local-') ? undefined : state.attemptId),
      resultId: state.resultId,
      startedAt: state.endsAt - input.test.pattern.durationMinutes * 60_000,
      endsAt: state.endsAt,
      status: 'running',
      currentQuestion,
      currentQuestionId,
      currentEnteredAt: state.currentEnteredAt,
      sectionUnlocked: state.sectionUnlocked,
      submissionAttemptCount: 0,
      submissionAuto: false,
      createdAt: updatedAt,
      updatedAt,
    };

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const repositories = createOfflineRepositories(transaction);
      await repositories.attempts.insert(attempt);
      for (const [index, question] of input.paper.entries()) {
        const questionNo = index + 1;
        const choice = state.answers[questionNo];
        const marked = state.marked[questionNo] === true;
        const visited = state.visited[questionNo] === true || choice !== undefined || marked;
        if (!visited) continue;
        const revision = choice === undefined && !marked ? 0 : 1;
        await repositories.answers.put({
          userId: input.scope.userId,
          attemptId: attempt.id,
          questionId: question.id,
          questionNo,
          choice: choice ?? null,
          marked,
          visited: true,
          revision,
          syncState: revision === 0 ? 'clean' : 'dirty',
          updatedAt,
        });
        if (revision > 0) {
          const payload: AnswerOutboxPayload = {
            question_id: question.id,
            choice: choice ?? null,
            marked,
            revision,
          };
          await repositories.outbox.put({
            userId: input.scope.userId,
            id: `answer:${attempt.id}:${question.id}`,
            attemptId: attempt.id,
            operation: 'patch_answer',
            entityKey: question.id,
            revision,
            payload,
            status: 'pending',
            attemptCount: 0,
            createdAt: updatedAt,
            updatedAt,
          });
        }
      }
    });
    return attempt;
  }

  async findLatest(scope: UserScope, testId?: string): Promise<LocalAttempt | undefined> {
    const [attempt] = await createOfflineRepositories(this.database).attempts.listUnfinished(
      scope,
      testId,
    );
    return attempt;
  }

  async restore(scope: UserScope, attemptId: string): Promise<RestoredAttempt | undefined> {
    const repositories = createOfflineRepositories(this.database);
    const attempt = await repositories.attempts.get(scope, attemptId);
    if (!attempt) return undefined;
    const [answers, bundle] = await Promise.all([
      repositories.answers.list(scope, attemptId),
      resolveCachedRead(this.paperCache.readTestBundle(attempt.testId)),
    ]);
    return { attempt, answers, meta: bundle.meta, paper: bundle.questions };
  }

  /**
   * Serializes writes per attempt, then commits navigation and the current question row in
   * one SQLite transaction. Rapid option taps cannot let an older write finish last.
   */
  saveProgress(input: SaveProgressInput): Promise<void> {
    const key = `${input.scope.userId}\u0000${input.attemptId}`;
    const previous = this.writeChains.get(key) ?? Promise.resolve();
    const write = previous.catch(() => undefined).then(async () => {
      const updatedAt = this.now();
      await this.database.withExclusiveTransactionAsync(async (transaction) => {
        const repositories = createOfflineRepositories(transaction);
        const existing = await repositories.answers.get(
          input.scope,
          input.attemptId,
          input.currentQuestionId,
        );
        const attempt = await repositories.attempts.get(input.scope, input.attemptId);
        if (!attempt) throw new Error('Cannot save progress for a missing local attempt');
        const queueAnswerSync = input.queueAnswerSync ?? true;
        const revision = (existing?.revision ?? 0) + (queueAnswerSync ? 1 : 0);
        const updated = await repositories.attempts.update(input.scope, input.attemptId, {
          currentQuestion: input.currentQuestion,
          currentQuestionId: input.currentQuestionId,
          currentEnteredAt: input.currentEnteredAt,
          sectionUnlocked: input.sectionUnlocked,
          updatedAt,
        });
        if (!updated) throw new Error('Cannot save progress for a missing local attempt');
        await repositories.answers.put({
          userId: input.scope.userId,
          attemptId: input.attemptId,
          questionId: input.currentQuestionId,
          questionNo: input.currentQuestion,
          choice: input.choice,
          marked: input.marked,
          visited: input.visited,
          revision,
          syncState: queueAnswerSync ? 'dirty' : (existing?.syncState ?? 'clean'),
          updatedAt,
        });
        if (queueAnswerSync) {
          const payload: AnswerOutboxPayload = {
            question_id: input.currentQuestionId,
            choice: input.choice,
            marked: input.marked,
            revision,
          };
          await repositories.outbox.put({
            userId: input.scope.userId,
            id: `answer:${input.attemptId}:${input.currentQuestionId}`,
            attemptId: input.attemptId,
            operation: 'patch_answer',
            entityKey: input.currentQuestionId,
            revision,
            payload,
            status: 'pending',
            attemptCount: 0,
            createdAt: updatedAt,
            updatedAt,
          });
        }
      });
    });
    this.writeChains.set(key, write);
    const cleanup = () => {
      if (this.writeChains.get(key) === write) this.writeChains.delete(key);
    };
    void write.then(cleanup, cleanup);
    return write;
  }

  /** Waits for all earlier answer/navigation writes for one attempt to reach SQLite. */
  async flushWrites(scope: UserScope, attemptId: string): Promise<void> {
    await this.writeChains.get(`${scope.userId}\u0000${attemptId}`);
  }

  async updateStatus(
    scope: UserScope,
    attemptId: string,
    status: LocalAttemptStatus,
    resultId?: string,
  ): Promise<void> {
    const updated = await createOfflineRepositories(this.database).attempts.update(
      scope,
      attemptId,
      { status, resultId, updatedAt: this.now() },
    );
    if (!updated) throw new Error('Cannot update a missing local attempt');
  }
}

let durableAttemptServicePromise: Promise<DurableAttemptService> | undefined;

export function getDurableAttemptService(): Promise<DurableAttemptService> {
  if (!durableAttemptServicePromise) {
    durableAttemptServicePromise = Promise.all([getOfflineDatabase(), getPublicReadCache()]).then(
      ([database, cache]) => new DurableAttemptService(database, cache),
    );
  }
  return durableAttemptServicePromise;
}

export function resetDurableAttemptServiceForTests(): void {
  durableAttemptServicePromise = undefined;
  idSequence = 0;
}
