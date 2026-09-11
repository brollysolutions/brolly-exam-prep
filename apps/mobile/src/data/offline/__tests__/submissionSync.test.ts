import { ApiError } from '../../api';
import { getNetworkStateAsync } from 'expo-network';
import { AnswerSyncService } from '../answerSync';
import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { DurableAttemptService } from '../durableAttempts';
import { createOfflineRepositories, type LocalAttempt, type UserScope } from '../repositories';
import { SubmissionSyncService } from '../submissionSync';

jest.unmock('../answerSync');
jest.unmock('../durableAttempts');
jest.unmock('../submissionSync');
jest.mock('expo-network', () => ({ getNetworkStateAsync: jest.fn() }));

const mockedNetworkState = getNetworkStateAsync as jest.MockedFunction<
  typeof getNetworkStateAsync
>;

declare function require(id: string): unknown;

type NativeRunResult = { changes: number | bigint; lastInsertRowid: number | bigint };
type NativeStatement = {
  run: (...params: unknown[]) => NativeRunResult;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};
type NativeDatabase = {
  exec: (source: string) => void;
  prepare: (source: string) => NativeStatement;
  close: () => void;
};
type DatabaseSyncConstructor = new (path: string) => NativeDatabase;

const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: DatabaseSyncConstructor };
const { tmpdir } = require('node:os') as { tmpdir: () => string };
const { join } = require('node:path') as { join: (...parts: string[]) => string };
const { unlinkSync } = require('node:fs') as { unlinkSync: (path: string) => void };

class TestDatabase implements OfflineDatabase {
  private readonly native: NativeDatabase;

  constructor(path = ':memory:') {
    this.native = new DatabaseSync(path);
  }

  async execAsync(source: string): Promise<void> {
    this.native.exec(source);
  }

  async runAsync(source: string, ...params: SqlValue[]): Promise<SqlRunResult> {
    const result = this.native.prepare(source).run(...params);
    return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
  }

  async getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null> {
    return (this.native.prepare(source).get(...params) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]> {
    return this.native.prepare(source).all(...params) as T[];
  }

  async withExclusiveTransactionAsync(
    task: (transaction: OfflineDatabase) => Promise<void>,
  ): Promise<void> {
    this.native.exec('BEGIN IMMEDIATE');
    try {
      await task(this);
      this.native.exec('COMMIT');
    } catch (error) {
      this.native.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    this.native.close();
  }
}

const NOW = 1_800_000_000_000;
const alice = { userId: 'user-alice' };
const bob = { userId: 'user-bob' };

function attempt(
  scope: UserScope = alice,
  id = 'local-attempt-1',
  serverAttemptId: string | undefined = 'server-attempt-1',
  overrides: Partial<LocalAttempt> = {},
): LocalAttempt {
  return {
    userId: scope.userId,
    id,
    testId: 'test-pwt-07',
    serverAttemptId,
    startedAt: NOW,
    endsAt: NOW + 60_000,
    status: 'running',
    currentQuestion: 1,
    currentQuestionId: 'question-1',
    currentEnteredAt: NOW,
    sectionUnlocked: [true],
    submissionAttemptCount: 0,
    submissionAuto: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

const serverAttempt = (status: 'in_progress' | 'submitted' | 'auto_submitted' = 'in_progress') => ({
  id: 'server-attempt-1',
  test_id: 'test-pwt-07',
  started_at: new Date(NOW).toISOString(),
  ends_at: new Date(NOW + 60_000).toISOString(),
  status,
  answers: [],
});

function noTimer() {
  return {
    schedule: jest.fn(() => 1 as never),
    cancelSchedule: jest.fn(),
  };
}

describe('Phase 5 durable submission synchronization', () => {
  let database: TestDatabase;
  let now: number;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    now = NOW;
    mockedNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
  });

  afterEach(() => database.close());

  async function seed(value = attempt()) {
    await createOfflineRepositories(database).attempts.insert(value);
    return value;
  }

  function worker(options: {
    online?: boolean;
    scope?: UserScope;
    submit?: jest.Mock;
    get?: jest.Mock;
    flush?: jest.Mock;
    create?: jest.Mock;
    authenticated?: boolean;
  } = {}) {
    const submitAttempt = options.submit ?? jest.fn(async () => ({ result_id: 'result-1' }));
    const getAttempt = options.get ?? jest.fn(async () => serverAttempt());
    const flushAttempt = options.flush ?? jest.fn(async () => true);
    const createAttempt =
      options.create ??
      jest.fn(async () => ({
        id: 'server-created-1',
        test_id: 'test-pwt-07',
        started_at: new Date(NOW).toISOString(),
        ends_at: new Date(NOW + 60_000).toISOString(),
        status: 'in_progress' as const,
      }));
    return {
      submitAttempt,
      getAttempt,
      flushAttempt,
      createAttempt,
      service: new SubmissionSyncService(
        database,
        { submitAttempt, getAttempt, createAttempt } as never,
        { flushAttempt } as never,
        {
          now: () => now,
          isOnline: async () => options.online ?? true,
          canProcess: (scope) => scope.userId === (options.scope ?? alice).userId,
          isAuthenticated: () => options.authenticated ?? true,
          ...noTimer(),
        },
      ),
    };
  }

  it('persists offline submit intent without calling the API', async () => {
    await seed();
    const sync = worker({ online: false });

    await expect(sync.service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      offline: true,
      pending: 1,
    });
    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'pending_submit',
      submissionRequestedAt: NOW,
      resultId: undefined,
    });
  });

  it('keeps the existing online path and persists its result id immediately', async () => {
    await seed();
    const sync = worker();

    await expect(sync.service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      completed: [expect.objectContaining({ resultId: 'result-1' })],
    });
    expect(sync.submitAttempt).toHaveBeenCalledTimes(1);
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'submitted',
      resultId: 'result-1',
      submissionCompletedAt: NOW,
    });
  });

  it('submits on connected Android Wi-Fi even when internet validation is false', async () => {
    await seed();
    mockedNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: false,
    });
    const submitAttempt = jest.fn(async () => ({ result_id: 'lan-result' }));
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn() } as never,
      { flushAttempt: jest.fn(async () => true) } as never,
      { now: () => now, canProcess: () => true, ...noTimer() },
    );

    await expect(service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      offline: false,
      completed: [expect.objectContaining({ resultId: 'lan-result' })],
    });
    expect(mockedNetworkState).toHaveBeenCalled();
    expect(submitAttempt).toHaveBeenCalledWith('server-attempt-1');
  });

  it('synchronizes the final coalesced answer before submission', async () => {
    await seed();
    const events: string[] = [];
    const durable = new DurableAttemptService(database, { readTestBundle: jest.fn() }, () => now);
    for (const choice of [0, 2, 1] as const) {
      await durable.saveProgress({
        scope: alice,
        attemptId: 'local-attempt-1',
        currentQuestion: 1,
        currentQuestionId: 'question-1',
        sectionUnlocked: [true],
        choice,
        marked: false,
        visited: true,
      });
      now += 1;
    }
    const patchAttemptAnswer = jest.fn(async (_id, body) => {
      events.push(`answer:${body.choice}`);
      return { ok: true };
    });
    const answerSync = new AnswerSyncService(database, { patchAttemptAnswer }, {
      now: () => now,
      isOnline: async () => true,
      canProcess: () => true,
      ...noTimer(),
    });
    const submitAttempt = jest.fn(async () => {
      events.push('submit');
      return { result_id: 'result-final' };
    });
    const sync = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn() } as never,
      answerSync,
      { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
    );

    await sync.requestSubmission(alice, 'local-attempt-1');

    expect(events).toEqual(['answer:1', 'submit']);
    expect(patchAttemptAnswer).toHaveBeenCalledTimes(1);
    await expect(
      createOfflineRepositories(database).answers.get(alice, 'local-attempt-1', 'question-1'),
    ).resolves.toMatchObject({ choice: 1, syncState: 'clean' });
  });

  it('makes delayed temporary answers due on manual retry and submits after they are clean', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'pending_submit',
        submissionRequestedAt: NOW - 10_000,
        submissionNextAttemptAt: NOW + 60_000,
        submissionLastError: 'waiting:answers_unsynchronized',
      }),
    );
    const repositories = createOfflineRepositories(database);
    for (const [index, choice] of [1, 3].entries()) {
      const questionId = `question-${index + 1}`;
      const revision = index + 1;
      await repositories.answers.put({
        userId: alice.userId,
        attemptId: 'local-attempt-1',
        questionId,
        questionNo: index + 1,
        choice,
        marked: index === 1,
        visited: true,
        revision,
        syncState: 'dirty',
        updatedAt: NOW - 5_000 + index,
      });
      await repositories.outbox.put({
        userId: alice.userId,
        id: `answer:local-attempt-1:${questionId}`,
        attemptId: 'local-attempt-1',
        operation: 'patch_answer',
        entityKey: questionId,
        revision,
        payload: {
          question_id: questionId,
          choice,
          marked: index === 1,
          revision,
        },
        status: index === 0 ? 'pending' : 'failed',
        attemptCount: index === 0 ? 0 : 2,
        nextAttemptAt: index === 0 ? undefined : NOW + 60_000,
        lastError: index === 0 ? undefined : 'temporary:0:network_error',
        createdAt: NOW - 5_000 + index,
        updatedAt: NOW - 5_000 + index,
      });
    }
    const events: string[] = [];
    const patchAttemptAnswer = jest.fn(async (_id, body) => {
      events.push(`answer:${body.question_id}`);
      return { ok: true };
    });
    const answerSync = new AnswerSyncService(
      database,
      { patchAttemptAnswer },
      {
        now: () => now,
        isOnline: async () => true,
        canProcess: () => true,
        ...noTimer(),
      },
    );
    const submitAttempt = jest.fn(async () => {
      events.push('submit');
      return { result_id: 'result-after-manual-retry' };
    });
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn() } as never,
      answerSync,
      {
        now: () => now,
        isOnline: async () => true,
        canProcess: () => true,
        ...noTimer(),
      },
    );

    await expect(service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      completed: [expect.objectContaining({ resultId: 'result-after-manual-retry' })],
    });

    expect(events).toEqual(['answer:question-1', 'answer:question-2', 'submit']);
    expect(patchAttemptAnswer).toHaveBeenCalledTimes(2);
    expect(submitAttempt).toHaveBeenCalledTimes(1);
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
    await expect(repositories.answers.list(alice, 'local-attempt-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionId: 'question-1', syncState: 'clean' }),
        expect.objectContaining({ questionId: 'question-2', syncState: 'clean' }),
      ]),
    );
    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      status: 'submitted',
      resultId: 'result-after-manual-retry',
      submissionNextAttemptAt: undefined,
      submissionLastError: undefined,
    });
  });

  it('does not make authentication-paused answers due on manual retry', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'pending_submit',
        submissionRequestedAt: NOW - 10_000,
        submissionLastError: 'auth:401',
      }),
    );
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.outbox.put({
      userId: alice.userId,
      id: 'answer:local-attempt-1:question-1',
      attemptId: 'local-attempt-1',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'failed',
      attemptCount: 1,
      lastError: 'auth:401',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const patchAttemptAnswer = jest.fn();
    const submitAttempt = jest.fn();
    const answerSync = new AnswerSyncService(database, { patchAttemptAnswer }, {
      now: () => now,
      isOnline: async () => true,
      canProcess: () => true,
      ...noTimer(),
    });
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn() } as never,
      answerSync,
      { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
    );

    await expect(service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      pending: 1,
    });

    expect(patchAttemptAnswer).not.toHaveBeenCalled();
    expect(submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.outbox.list(alice)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'failed', lastError: 'auth:401' }),
      ]),
    );
  });

  it('does not make permanently failed answers due on manual retry', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'pending_submit',
        submissionRequestedAt: NOW - 10_000,
        submissionNextAttemptAt: NOW + 60_000,
        submissionLastError: 'waiting:answers_unsynchronized',
      }),
    );
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.outbox.put({
      userId: alice.userId,
      id: 'answer:local-attempt-1:question-1',
      attemptId: 'local-attempt-1',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'failed',
      attemptCount: 1,
      lastError: 'permanent:422:http_error',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const patchAttemptAnswer = jest.fn();
    const submitAttempt = jest.fn();
    const answerSync = new AnswerSyncService(database, { patchAttemptAnswer }, {
      now: () => now,
      isOnline: async () => true,
      canProcess: () => true,
      ...noTimer(),
    });
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn() } as never,
      answerSync,
      { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
    );

    await expect(service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      permanentFailures: 1,
    });

    expect(patchAttemptAnswer).not.toHaveBeenCalled();
    expect(submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      status: 'sync_failed',
      submissionLastError: 'blocked:answer_sync_permanent',
    });
  });

  it('reports a durable sync_failed attempt without retrying answers or submission', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'sync_failed',
        submissionRequestedAt: NOW - 10_000,
        submissionLastError: 'blocked:answer_sync_permanent',
      }),
    );
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.outbox.put({
      userId: alice.userId,
      id: 'answer:local-attempt-1:question-1',
      attemptId: 'local-attempt-1',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'failed',
      attemptCount: 1,
      lastError: 'permanent:422:http_error',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const patchAttemptAnswer = jest.fn();
    const submitAttempt = jest.fn();
    const getAttempt = jest.fn();
    const answerSync = new AnswerSyncService(
      database,
      { patchAttemptAnswer },
      {
        now: () => now,
        isOnline: async () => true,
        canProcess: () => true,
        ...noTimer(),
      },
    );
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt } as never,
      answerSync,
      { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
    );

    await expect(service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      failed: 1,
      permanentFailures: 1,
      failureReason: 'blocked:answer_sync_permanent',
    });

    expect(patchAttemptAnswer).not.toHaveBeenCalled();
    expect(getAttempt).not.toHaveBeenCalled();
    expect(submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      status: 'sync_failed',
      submissionLastError: 'blocked:answer_sync_permanent',
    });
  });

  it('does not submit while the answer outbox or a dirty answer remains', async () => {
    await seed();
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    const sync = worker({ flush: jest.fn(async () => false) });

    await sync.service.requestSubmission(alice, 'local-attempt-1');

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      status: 'pending_submit',
      submissionLastError: 'waiting:answers_unsynchronized',
    });
  });

  it('stops retrying when a required answer has a permanent sync failure', async () => {
    await seed();
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.outbox.put({
      userId: alice.userId,
      id: 'answer:local-attempt-1:question-1',
      attemptId: 'local-attempt-1',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'failed',
      attemptCount: 1,
      lastError: 'permanent:422:http_error',
      createdAt: NOW,
      updatedAt: NOW,
    });
    const sync = worker({ flush: jest.fn(async () => false) });

    await sync.service.requestSubmission(alice, 'local-attempt-1');
    await sync.service.syncNow(alice);

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      status: 'sync_failed',
      submissionNextAttemptAt: undefined,
      submissionLastError: 'blocked:answer_sync_permanent',
    });
  });

  it('coalesces a double tap into one active submission', async () => {
    await seed();
    let release: (() => void) | undefined;
    const response = new Promise<{ result_id: string }>((resolve) => {
      release = () => resolve({ result_id: 'result-once' });
    });
    const submit = jest.fn(() => response);
    const sync = worker({ submit });

    const first = sync.service.requestSubmission(alice, 'local-attempt-1');
    const second = sync.service.requestSubmission(alice, 'local-attempt-1');
    await Promise.resolve();
    await Promise.resolve();
    release?.();
    await Promise.all([first, second]);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('keeps an ambiguous network failure in submitting state with durable backoff', async () => {
    await seed();
    const submit = jest.fn(async () => {
      throw new ApiError(0, 'network_error');
    });
    const sync = worker({ submit });

    await sync.service.requestSubmission(alice, 'local-attempt-1');

    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'submitting',
      submissionAttemptCount: 1,
      submissionNextAttemptAt: NOW + 2_000,
      submissionLastError: 'temporary:0:network_error',
    });
  });

  it('reconciles an interrupted submission before safely retrying the POST', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'submitting',
        submissionRequestedAt: NOW - 10_000,
        submissionAttemptCount: 1,
      }),
    );
    const events: string[] = [];
    const get = jest.fn(async () => {
      events.push('get');
      return serverAttempt('in_progress');
    });
    const submit = jest.fn(async () => {
      events.push('submit');
      return { result_id: 'result-retried' };
    });

    await worker({ get, submit }).service.syncNow(alice);

    expect(events).toEqual(['get', 'submit']);
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({ status: 'submitted', resultId: 'result-retried' });
  });

  it('does not repost when the server already accepted an ambiguous submission', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'submitting',
        submissionAttemptCount: 1,
      }),
    );
    const sync = worker({ get: jest.fn(async () => serverAttempt('submitted')) });

    await sync.service.syncNow(alice);

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'sync_failed',
      resultId: undefined,
      submissionLastError: 'permanent:submitted_result_id_unavailable',
    });
  });

  it('finishes recovery locally when result_id was already persisted', async () => {
    await seed(
      attempt(alice, 'local-attempt-1', 'server-attempt-1', {
        status: 'submitting',
        resultId: 'result-persisted',
        submissionAuto: true,
      }),
    );
    const sync = worker();

    await expect(sync.service.syncNow(alice)).resolves.toMatchObject({
      completed: [expect.objectContaining({ resultId: 'result-persisted' })],
    });
    expect(sync.getAttempt).not.toHaveBeenCalled();
    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({ status: 'auto_submitted' });
  });

  it('retries a temporary server response using persisted exponential metadata', async () => {
    await seed();
    const submit = jest.fn(async () => {
      throw new ApiError(503, 'http_error');
    });

    await worker({ submit }).service.requestSubmission(alice, 'local-attempt-1');

    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'submitting',
      submissionAttemptCount: 1,
      submissionNextAttemptAt: NOW + 2_000,
      submissionLastError: 'temporary:503:http_error',
    });
  });

  it('records a permanent 4xx and never retries it', async () => {
    await seed();
    const submit = jest.fn(async () => {
      throw new ApiError(422, 'http_error');
    });
    const sync = worker({ submit });

    await sync.service.requestSubmission(alice, 'local-attempt-1');
    await sync.service.syncNow(alice);

    expect(submit).toHaveBeenCalledTimes(1);
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-attempt-1'),
    ).resolves.toMatchObject({
      status: 'sync_failed',
      submissionNextAttemptAt: undefined,
      submissionLastError: 'permanent:422:http_error',
    });
  });

  it('pauses on 401 and resumes only after authentication restoration', async () => {
    await seed();
    const submit = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(401, 'http_error'))
      .mockResolvedValue({ result_id: 'result-after-login' });
    const sync = worker({ submit });

    await expect(sync.service.requestSubmission(alice, 'local-attempt-1')).resolves.toMatchObject({
      pausedForAuth: true,
    });
    await sync.service.syncNow(alice);
    expect(submit).toHaveBeenCalledTimes(1);
    await sync.service.resumeAfterAuthentication(alice);
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('never processes another user pending submission', async () => {
    await seed(attempt(alice, 'local-alice', 'server-alice', { status: 'pending_submit' }));
    await seed(attempt(bob, 'local-bob', 'server-bob', { status: 'pending_submit' }));
    const sync = worker({ scope: alice });

    await sync.service.syncNow(alice);

    expect(sync.submitAttempt).toHaveBeenCalledTimes(1);
    await expect(createOfflineRepositories(database).attempts.get(bob, 'local-bob')).resolves.toMatchObject({
      status: 'pending_submit',
      resultId: undefined,
    });
  });

  it('keeps two pending attempts independent', async () => {
    await seed(attempt(alice, 'local-a', 'server-a', { status: 'pending_submit' }));
    await seed(attempt(alice, 'local-b', 'server-b', { status: 'pending_submit' }));
    const submit = jest
      .fn()
      .mockResolvedValueOnce({ result_id: 'result-a' })
      .mockResolvedValueOnce({ result_id: 'result-b' });

    await worker({ submit }).service.syncNow(alice);

    expect(submit.mock.calls.map(([id]) => id)).toEqual(['server-a', 'server-b']);
    await expect(createOfflineRepositories(database).attempts.get(alice, 'local-a')).resolves.toMatchObject({ resultId: 'result-a' });
    await expect(createOfflineRepositories(database).attempts.get(alice, 'local-b')).resolves.toMatchObject({ resultId: 'result-b' });
  });

  it('preserves an expired deadline and records auto submission intent', async () => {
    await seed(attempt(alice, 'expired', 'server-expired', { endsAt: NOW - 1 }));
    const sync = worker({ online: false });

    await sync.service.requestSubmission(alice, 'expired', true);

    await expect(createOfflineRepositories(database).attempts.get(alice, 'expired')).resolves.toMatchObject({
      endsAt: NOW - 1,
      status: 'pending_submit',
      submissionAuto: true,
    });
  });

  it('creates the server attempt for an offline local-only attempt, then submits', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const sync = worker();

    await expect(sync.service.requestSubmission(alice, 'local-only')).resolves.toMatchObject({
      completed: [expect.objectContaining({ resultId: 'result-1' })],
    });

    // The local attempt id is the idempotency key for the non-idempotent create POST.
    expect(sync.createAttempt).toHaveBeenCalledWith({
      test_id: 'test-pwt-07',
      client_attempt_id: 'local-only',
    });
    expect(sync.createAttempt).toHaveBeenCalledTimes(1);
    expect(sync.submitAttempt).toHaveBeenCalledWith('server-created-1');
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-only'),
    ).resolves.toMatchObject({
      status: 'submitted',
      serverAttemptId: 'server-created-1',
      resultId: 'result-1',
      submissionLastError: undefined,
    });
  });

  it('flushes dirty answers only after the server attempt is created, before submit', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-only',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.outbox.put({
      userId: alice.userId,
      id: 'answer:local-only:question-1',
      attemptId: 'local-only',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'pending',
      attemptCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const events: string[] = [];
    const patchAttemptAnswer = jest.fn(async () => {
      events.push('answer');
      return { ok: true };
    });
    const createAttempt = jest.fn(async () => {
      events.push('create');
      return {
        id: 'server-created-1',
        test_id: 'test-pwt-07',
        started_at: new Date(NOW).toISOString(),
        ends_at: new Date(NOW + 60_000).toISOString(),
        status: 'in_progress' as const,
      };
    });
    const submitAttempt = jest.fn(async () => {
      events.push('submit');
      return { result_id: 'result-ordered' };
    });
    const answerSync = new AnswerSyncService(
      database,
      { patchAttemptAnswer },
      { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
    );
    const service = new SubmissionSyncService(
      database,
      { submitAttempt, getAttempt: jest.fn(), createAttempt } as never,
      answerSync,
      {
        now: () => now,
        isOnline: async () => true,
        canProcess: () => true,
        isAuthenticated: () => true,
        ...noTimer(),
      },
    );

    await expect(service.requestSubmission(alice, 'local-only')).resolves.toMatchObject({
      completed: [expect.objectContaining({ resultId: 'result-ordered' })],
    });

    expect(events).toEqual(['create', 'answer', 'submit']);
    await expect(repositories.answers.get(alice, 'local-only', 'question-1')).resolves.toMatchObject(
      { syncState: 'clean' },
    );
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
  });

  it('does not submit a created attempt while a dirty answer is still unsynchronized', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const repositories = createOfflineRepositories(database);
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-only',
      questionId: 'question-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    const sync = worker({ flush: jest.fn(async () => false) });

    await sync.service.requestSubmission(alice, 'local-only');

    expect(sync.createAttempt).toHaveBeenCalledTimes(1);
    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(repositories.attempts.get(alice, 'local-only')).resolves.toMatchObject({
      status: 'pending_submit',
      serverAttemptId: 'server-created-1',
      submissionLastError: 'waiting:answers_unsynchronized',
    });
  });

  it('retries a temporary create failure with durable backoff and no submit', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const create = jest.fn(async () => {
      throw new ApiError(503, 'http_error');
    });
    const sync = worker({ create });

    await sync.service.requestSubmission(alice, 'local-only');

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-only'),
    ).resolves.toMatchObject({
      status: 'pending_submit',
      serverAttemptId: undefined,
      submissionAttemptCount: 1,
      submissionNextAttemptAt: NOW + 2_000,
      submissionLastError: 'temporary:503:http_error',
    });
  });

  it('marks a permanent create failure sync_failed and never retries it', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const create = jest.fn(async () => {
      throw new ApiError(404, 'http_error');
    });
    const sync = worker({ create });

    await expect(sync.service.requestSubmission(alice, 'local-only')).resolves.toMatchObject({
      permanentFailures: 1,
      failureReason: 'permanent:404:http_error',
    });

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-only'),
    ).resolves.toMatchObject({
      status: 'sync_failed',
      serverAttemptId: undefined,
      submissionNextAttemptAt: undefined,
      submissionLastError: 'permanent:404:http_error',
    });
  });

  it('pauses create on 401 without marking the attempt sync_failed', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const create = jest.fn(async () => {
      throw new ApiError(401, 'http_error');
    });
    const sync = worker({ create });

    await expect(sync.service.requestSubmission(alice, 'local-only')).resolves.toMatchObject({
      pausedForAuth: true,
    });

    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-only'),
    ).resolves.toMatchObject({
      status: 'pending_submit',
      serverAttemptId: undefined,
      submissionLastError: 'auth:401',
    });
  });

  it('never creates a server attempt for a phone-only (unauthenticated) session', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const sync = worker({ authenticated: false });

    await sync.service.requestSubmission(alice, 'local-only');

    expect(sync.createAttempt).not.toHaveBeenCalled();
    expect(sync.submitAttempt).not.toHaveBeenCalled();
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'local-only'),
    ).resolves.toMatchObject({
      status: 'pending_submit',
      serverAttemptId: undefined,
      submissionLastError: 'blocked:needs_authenticated_user',
    });
  });

  it('does not re-create a server attempt once one is persisted (idempotent recovery)', async () => {
    await seed(attempt(alice, 'local-only', undefined, { serverAttemptId: undefined }));
    const sync = worker();

    await sync.service.requestSubmission(alice, 'local-only');
    await sync.service.syncNow(alice);

    // After the first create persists the server id, recovery reuses it — no second POST.
    expect(sync.createAttempt).toHaveBeenCalledTimes(1);
  });

  it('keys create on the stable local id so a crash before persistence cannot duplicate', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-create-restart-${Date.now()}-${Math.random()}.db`);
    const keys: unknown[] = [];
    const first = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(first);
      await createOfflineRepositories(first).attempts.insert(
        attempt(alice, 'local-crash', undefined, {
          status: 'pending_submit',
          submissionRequestedAt: NOW,
          serverAttemptId: undefined,
        }),
      );
      // Crash: the create POST "happens" but the process dies before the id is persisted.
      const crashCreate = jest.fn(async (body: { client_attempt_id?: string }) => {
        keys.push(body.client_attempt_id);
        throw new ApiError(0, 'network_error');
      });
      const crashing = new SubmissionSyncService(
        first,
        { submitAttempt: jest.fn(), getAttempt: jest.fn(), createAttempt: crashCreate } as never,
        { flushAttempt: jest.fn(async () => true) } as never,
        { now: () => now, isOnline: async () => true, canProcess: () => true, isAuthenticated: () => true, ...noTimer() },
      );
      await crashing.syncNow(alice);
      first.close();

      // The device comes back after the temporary-failure backoff has elapsed.
      now = NOW + 2_000;
      const reopened = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(reopened);
        const recoverCreate = jest.fn(async (body: { client_attempt_id?: string }) => {
          keys.push(body.client_attempt_id);
          return {
            id: 'server-recovered',
            test_id: 'test-pwt-07',
            started_at: new Date(NOW).toISOString(),
            ends_at: new Date(NOW + 60_000).toISOString(),
            status: 'in_progress' as const,
          };
        });
        const recovered = new SubmissionSyncService(
          reopened,
          {
            submitAttempt: jest.fn(async () => ({ result_id: 'result-recovered' })),
            getAttempt: jest.fn(),
            createAttempt: recoverCreate,
          } as never,
          { flushAttempt: jest.fn(async () => true) } as never,
          { now: () => now, isOnline: async () => true, canProcess: () => true, isAuthenticated: () => true, ...noTimer() },
        );
        await recovered.syncNow(alice);

        // Both attempts carried the identical client key, so the idempotent backend returns the
        // same server attempt rather than creating a duplicate.
        expect(keys).toEqual(['local-crash', 'local-crash']);
        await expect(
          createOfflineRepositories(reopened).attempts.get(alice, 'local-crash'),
        ).resolves.toMatchObject({ status: 'submitted', serverAttemptId: 'server-recovered' });
      } finally {
        reopened.close();
      }
    } finally {
      try {
        first.close();
      } catch {
        // Closed above to simulate termination.
      }
      unlinkSync(path);
      database = new TestDatabase();
    }
  });

  it('restores sync_failed after a database restart without making it retryable', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-sync-failed-${Date.now()}-${Math.random()}.db`);
    const first = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(first);
      await createOfflineRepositories(first).attempts.insert(
        attempt(alice, 'failed-restart', 'failed-server', {
          status: 'sync_failed',
          submissionRequestedAt: NOW - 10_000,
          submissionLastError: 'permanent:422:http_error',
        }),
      );
      first.close();

      const reopened = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(reopened);
        const submit = jest.fn();
        const get = jest.fn();
        const flush = jest.fn();
        const sync = new SubmissionSyncService(
          reopened,
          { submitAttempt: submit, getAttempt: get } as never,
          { flushAttempt: flush } as never,
          {
            now: () => now,
            isOnline: async () => true,
            canProcess: () => true,
            ...noTimer(),
          },
        );

        await expect(sync.requestSubmission(alice, 'failed-restart')).resolves.toMatchObject({
          failed: 1,
          permanentFailures: 1,
          failureReason: 'permanent:422:http_error',
        });
        expect(flush).not.toHaveBeenCalled();
        expect(get).not.toHaveBeenCalled();
        expect(submit).not.toHaveBeenCalled();
        await expect(
          createOfflineRepositories(reopened).attempts.get(alice, 'failed-restart'),
        ).resolves.toMatchObject({
          status: 'sync_failed',
          submissionLastError: 'permanent:422:http_error',
        });
      } finally {
        reopened.close();
      }
    } finally {
      try {
        first.close();
      } catch {
        // Closed above to simulate termination.
      }
      unlinkSync(path);
      database = new TestDatabase();
    }
  });

  it('survives a database restart and resumes a pending submission', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-phase5-${Date.now()}-${Math.random()}.db`);
    const first = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(first);
      await createOfflineRepositories(first).attempts.insert(
        attempt(alice, 'restart-attempt', 'restart-server', {
          status: 'pending_submit',
          submissionRequestedAt: NOW,
        }),
      );
      first.close();

      const reopened = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(reopened);
        const submit = jest.fn(async () => ({ result_id: 'restart-result' }));
        const sync = new SubmissionSyncService(
          reopened,
          { submitAttempt: submit, getAttempt: jest.fn() } as never,
          { flushAttempt: jest.fn(async () => true) } as never,
          { now: () => now, isOnline: async () => true, canProcess: () => true, ...noTimer() },
        );
        await sync.syncNow(alice);
        expect(submit).toHaveBeenCalledWith('restart-server');
        await expect(createOfflineRepositories(reopened).attempts.get(alice, 'restart-attempt')).resolves.toMatchObject({
          status: 'submitted',
          resultId: 'restart-result',
        });
      } finally {
        reopened.close();
      }
    } finally {
      try {
        first.close();
      } catch {
        // Closed above to simulate termination.
      }
      unlinkSync(path);
      database = new TestDatabase();
    }
  });
});
