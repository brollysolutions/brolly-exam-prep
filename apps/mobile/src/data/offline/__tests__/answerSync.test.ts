import { ApiError } from '../../api';
import { getNetworkStateAsync } from 'expo-network';
import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { DurableAttemptService } from '../durableAttempts';
import { AnswerSyncService } from '../answerSync';
import { createOfflineRepositories, type LocalAttempt, type UserScope } from '../repositories';

jest.unmock('../answerSync');
jest.unmock('../durableAttempts');
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
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
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
const alice = { userId: 'user:alice' };
const bob = { userId: 'user:bob' };

function attempt(
  scope: UserScope,
  id: string,
  serverAttemptId: string | undefined,
): LocalAttempt {
  return {
    userId: scope.userId,
    id,
    testId: 'test-pwt-07',
    serverAttemptId,
    startedAt: NOW,
    endsAt: NOW + 9_000_000,
    status: 'running',
    currentQuestion: 1,
    currentQuestionId: 'question-1',
    currentEnteredAt: NOW,
    sectionUnlocked: [true],
    submissionAttemptCount: 0,
    submissionAuto: false,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function noTimer() {
  return {
    schedule: jest.fn(() => ({}) as ReturnType<typeof setTimeout>),
    cancelSchedule: jest.fn(),
  };
}

describe('Phase 4 answer synchronization', () => {
  let database: TestDatabase;
  let now: number;
  let durable: DurableAttemptService;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    now = NOW;
    mockedNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
    });
    durable = new DurableAttemptService(
      database,
      { readTestBundle: jest.fn() },
      () => now,
    );
  });

  afterEach(() => database.close());

  async function seedAttempt(
    scope = alice,
    id = 'local-attempt-1',
    serverAttemptId: string | null = 'server-attempt-1',
  ) {
    await createOfflineRepositories(database).attempts.insert(
      attempt(scope, id, serverAttemptId ?? undefined),
    );
    return id;
  }

  async function save(
    choice: 0 | 1 | 2 | 3 | null,
    options: {
      scope?: UserScope;
      attemptId?: string;
      questionId?: string;
      questionNo?: number;
      marked?: boolean;
    } = {},
  ) {
    const scope = options.scope ?? alice;
    const attemptId = options.attemptId ?? 'local-attempt-1';
    const questionId = options.questionId ?? 'question-1';
    await durable.saveProgress({
      scope,
      attemptId,
      currentQuestion: options.questionNo ?? 1,
      currentQuestionId: questionId,
      currentEnteredAt: now,
      sectionUnlocked: [true],
      choice,
      marked: options.marked ?? false,
      visited: true,
      queueAnswerSync: true,
    });
  }

  function worker(
    patchAttemptAnswer: jest.Mock,
    options: { online?: boolean; currentScope?: UserScope } = {},
  ) {
    return new AnswerSyncService(database, { patchAttemptAnswer }, {
      now: () => now,
      isOnline: async () => options.online ?? true,
      canProcess: (scope) => scope.userId === (options.currentScope ?? alice).userId,
      ...noTimer(),
    });
  }

  it('commits the local answer and pending outbox operation together', async () => {
    await seedAttempt();
    await save(1, { marked: true });
    const repositories = createOfflineRepositories(database);

    await expect(repositories.answers.get(alice, 'local-attempt-1', 'question-1')).resolves.toMatchObject({
      choice: 1,
      marked: true,
      revision: 1,
      syncState: 'dirty',
    });
    await expect(repositories.outbox.list(alice)).resolves.toMatchObject([
      {
        attemptId: 'local-attempt-1',
        entityKey: 'question-1',
        revision: 1,
        status: 'pending',
        payload: { question_id: 'question-1', choice: 1, marked: true, revision: 1 },
      },
    ]);
  });

  it('coalesces repeated changes and uploads only the latest answer', async () => {
    await seedAttempt();
    await save(0);
    now += 1;
    await save(2);
    now += 1;
    await save(1);
    const patch = jest.fn(async () => ({ ok: true }));

    expect(await createOfflineRepositories(database).outbox.list(alice)).toHaveLength(1);
    await worker(patch).syncNow(alice);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('server-attempt-1', {
      question_id: 'question-1',
      choice: 1,
      marked: false,
    });
  });

  it('removes a successful operation but preserves the local answer for resume', async () => {
    await seedAttempt();
    await save(3);
    const patch = jest.fn(async () => ({ ok: true }));

    await expect(worker(patch).syncNow(alice)).resolves.toMatchObject({ synced: 1 });
    const repositories = createOfflineRepositories(database);
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
    await expect(repositories.answers.get(alice, 'local-attempt-1', 'question-1')).resolves.toMatchObject({
      choice: 3,
      revision: 1,
      syncState: 'clean',
    });
  });

  it('persists temporary failure details and retries after an app/service restart', async () => {
    await seedAttempt();
    await save(2);
    const failing = jest.fn(async () => {
      throw new ApiError(503, 'http_error');
    });

    await worker(failing).syncNow(alice);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toMatchObject([
      {
        status: 'failed',
        attemptCount: 1,
        nextAttemptAt: NOW + 2_000,
        lastError: 'temporary:503:http_error',
      },
    ]);

    now += 2_000;
    const afterRestart = jest.fn(async () => ({ ok: true }));
    await worker(afterRestart).syncNow(alice);
    expect(afterRestart).toHaveBeenCalledTimes(1);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toEqual([]);
  });

  it('records a permanent client failure without retrying it forever', async () => {
    await seedAttempt();
    await save(2);
    const patch = jest.fn(async () => {
      throw new ApiError(422, 'http_error');
    });
    const sync = worker(patch);

    await sync.syncNow(alice);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toMatchObject([
      {
        status: 'failed',
        attemptCount: 1,
        nextAttemptAt: undefined,
        lastError: 'permanent:422:http_error',
      },
    ]);
    await sync.syncNow(alice);
    expect(patch).toHaveBeenCalledTimes(1);
  });

  it('repairs a pre-Phase-4 dirty answer that has no outbox row', async () => {
    await seedAttempt();
    await createOfflineRepositories(database).answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-legacy',
      questionNo: 4,
      choice: 3,
      marked: true,
      visited: true,
      revision: 5,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    const patch = jest.fn(async () => ({ ok: true }));

    await worker(patch).syncNow(alice);

    expect(patch).toHaveBeenCalledWith('server-attempt-1', {
      question_id: 'question-legacy',
      choice: 3,
      marked: true,
    });
    await expect(createOfflineRepositories(database).answers.get(alice, 'local-attempt-1', 'question-legacy')).resolves.toMatchObject({
      revision: 5,
      syncState: 'clean',
    });
  });

  it('keeps answers and outbox rows untouched while offline', async () => {
    await seedAttempt();
    await save(2);
    const patch = jest.fn();

    await expect(worker(patch, { online: false }).syncNow(alice)).resolves.toMatchObject({
      offline: true,
      synced: 0,
    });
    expect(patch).not.toHaveBeenCalled();
    await expect(createOfflineRepositories(database).answers.get(alice, 'local-attempt-1', 'question-1')).resolves.toMatchObject({
      choice: 2,
      syncState: 'dirty',
    });
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toHaveLength(1);
  });

  it('uploads on connected Android Wi-Fi even when internet validation is false', async () => {
    await seedAttempt();
    await save(2);
    mockedNetworkState.mockResolvedValue({
      isConnected: true,
      isInternetReachable: false,
    });
    const patch = jest.fn(async () => ({ ok: true }));
    const sync = new AnswerSyncService(
      database,
      { patchAttemptAnswer: patch },
      { now: () => now, canProcess: () => true, ...noTimer() },
    );

    await expect(sync.syncNow(alice)).resolves.toMatchObject({ offline: false, synced: 1 });
    expect(mockedNetworkState).toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith('server-attempt-1', {
      question_id: 'question-1',
      choice: 2,
      marked: false,
    });
  });

  it('pauses all operations after 401 and resumes them only after authentication', async () => {
    await seedAttempt();
    await save(1);
    await save(2, { questionId: 'question-2', questionNo: 2 });
    const patch = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(401, 'http_error'))
      .mockResolvedValue({ ok: true });
    const sync = worker(patch);

    await expect(sync.syncNow(alice)).resolves.toMatchObject({ pausedForAuth: true });
    expect(patch).toHaveBeenCalledTimes(1);
    now += 1;
    await save(3);
    await sync.syncNow(alice);
    expect(patch).toHaveBeenCalledTimes(1);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'failed', lastError: 'auth:401', revision: 2 }),
      ]),
    );

    await sync.resumeAfterAuthentication(alice);
    expect(patch).toHaveBeenCalledTimes(3);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toEqual([]);
  });

  it('never processes one user with another user session', async () => {
    await seedAttempt(alice, 'local-alice', 'server-alice');
    await seedAttempt(bob, 'local-bob', 'server-bob');
    await save(1, { scope: alice, attemptId: 'local-alice' });
    await save(3, { scope: bob, attemptId: 'local-bob' });
    const patch = jest.fn(async () => ({ ok: true }));

    await worker(patch, { currentScope: alice }).syncNow(alice);

    expect(patch).toHaveBeenCalledTimes(1);
    expect(patch).toHaveBeenCalledWith('server-alice', expect.anything());
    await expect(createOfflineRepositories(database).outbox.list(bob)).resolves.toHaveLength(1);
  });

  it('synchronizes two attempts for the same test independently', async () => {
    await seedAttempt(alice, 'local-a', 'server-a');
    await seedAttempt(alice, 'local-b', 'server-b');
    await save(1, { attemptId: 'local-a' });
    await save(3, { attemptId: 'local-b' });
    const patch = jest.fn(async () => ({ ok: true }));

    await worker(patch).syncNow(alice);

    expect(
      (patch.mock.calls as unknown as [string, { choice: number }][]).map(
        ([serverId, body]) => [serverId, body.choice],
      ),
    ).toEqual([
      ['server-a', 1],
      ['server-b', 3],
    ]);
  });

  it('keeps a newer revision pending while an older request is in flight', async () => {
    await seedAttempt();
    await save(0);
    let release: (() => void) | undefined;
    let announce: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      announce = resolve;
    });
    const firstResponse = new Promise<void>((resolve) => {
      release = resolve;
    });
    const patch = jest
      .fn()
      .mockImplementationOnce(async () => {
        announce?.();
        await firstResponse;
        return { ok: true };
      })
      .mockResolvedValue({ ok: true });
    const sync = worker(patch);
    const firstRun = sync.syncNow(alice);
    await started;

    now += 1;
    await save(2);
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toMatchObject([
      { revision: 2, status: 'pending', payload: { choice: 2, revision: 2 } },
    ]);
    const joinedRun = sync.syncNow(alice);
    release?.();
    await Promise.all([firstRun, joinedRun]);

    const repositories = createOfflineRepositories(database);
    await expect(repositories.answers.get(alice, 'local-attempt-1', 'question-1')).resolves.toMatchObject({
      choice: 2,
      revision: 2,
      syncState: 'clean',
    });
    expect(patch.mock.calls.map(([, body]) => body.choice)).toEqual([0, 2]);
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
  });

  it('leaves offline-created attempts pending without inventing a server attempt', async () => {
    await seedAttempt(alice, 'local-only', null);
    await save(1, { attemptId: 'local-only' });
    const patch = jest.fn();

    await expect(worker(patch).syncNow(alice)).resolves.toMatchObject({ skipped: 1 });
    expect(patch).not.toHaveBeenCalled();
    await expect(createOfflineRepositories(database).outbox.list(alice)).resolves.toHaveLength(1);
  });

  it('continues independent answers after a temporary failure and never submits', async () => {
    await seedAttempt();
    await save(1);
    await save(2, { questionId: 'question-2', questionNo: 2 });
    const submitAttempt = jest.fn();
    const patchAttemptAnswer = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(500, 'http_error'))
      .mockResolvedValue({ ok: true });
    const sync = new AnswerSyncService(
      database,
      { patchAttemptAnswer, submitAttempt } as never,
      {
        now: () => now,
        isOnline: async () => true,
        canProcess: () => true,
        ...noTimer(),
      },
    );

    await expect(sync.syncNow(alice)).resolves.toMatchObject({ synced: 1, failed: 1 });
    expect(patchAttemptAnswer).toHaveBeenCalledTimes(2);
    expect(submitAttempt).not.toHaveBeenCalled();
  });

  it('loads a persisted outbox after closing SQLite and synchronizes it', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-phase4-${Date.now()}-${Math.random()}.db`);
    const first = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(first);
      await createOfflineRepositories(first).attempts.insert(
        attempt(alice, 'restart-attempt', 'restart-server'),
      );
      const firstDurable = new DurableAttemptService(
        first,
        { readTestBundle: jest.fn() },
        () => now,
      );
      await firstDurable.saveProgress({
        scope: alice,
        attemptId: 'restart-attempt',
        currentQuestion: 1,
        currentQuestionId: 'question-1',
        sectionUnlocked: [true],
        choice: 3,
        marked: false,
        visited: true,
      });
      first.close();

      const reopened = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(reopened);
        const patch = jest.fn(async () => ({ ok: true }));
        const sync = new AnswerSyncService(reopened, { patchAttemptAnswer: patch }, {
          now: () => now,
          isOnline: async () => true,
          canProcess: () => true,
          ...noTimer(),
        });
        await sync.syncNow(alice);
        expect(patch).toHaveBeenCalledWith('restart-server', {
          question_id: 'question-1',
          choice: 3,
          marked: false,
        });
        await expect(createOfflineRepositories(reopened).answers.get(alice, 'restart-attempt', 'question-1')).resolves.toMatchObject({
          choice: 3,
          syncState: 'clean',
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
