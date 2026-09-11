import {
  getOfflineDatabase,
  getOfflineSchemaVersion,
  initializeOfflineDatabase,
  OFFLINE_SCHEMA_VERSION,
  OFFLINE_MIGRATIONS,
  resetOfflineDatabaseForTests,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { createOfflineRepositories, type LocalAttempt, type OutboxEntry } from '../repositories';

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

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

class TestDatabase implements OfflineDatabase {
  private readonly native = new DatabaseSync(':memory:');

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
const alice = { userId: 'user-alice' };
const bob = { userId: 'user-bob' };

function attempt(overrides: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    userId: 'user-alice',
    id: 'local-attempt-1',
    testId: 'test-pwt-07',
    serverAttemptId: 'server-attempt-1',
    startedAt: NOW,
    endsAt: NOW + 60_000,
    status: 'running',
    currentQuestion: 1,
    currentQuestionId: 'question-stable-1',
    currentEnteredAt: NOW,
    sectionUnlocked: [true],
    submissionAttemptCount: 0,
    submissionAuto: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function outbox(overrides: Partial<OutboxEntry> = {}): OutboxEntry {
  return {
    userId: 'user-alice',
    id: 'outbox-1',
    attemptId: 'local-attempt-1',
    operation: 'patch_answer',
    entityKey: 'question-1',
    revision: 1,
    payload: { question_id: 'question-1', choice: 2 },
    status: 'pending',
    attemptCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('offline database initialization and migrations', () => {
  let database: TestDatabase;

  beforeEach(() => {
    database = new TestDatabase();
    resetOfflineDatabaseForTests();
  });

  afterEach(() => {
    resetOfflineDatabaseForTests();
    database.close();
    jest.clearAllMocks();
  });

  it('initializes every application-owned table, index and foreign-key enforcement', async () => {
    await initializeOfflineDatabase(database);

    expect(await getOfflineSchemaVersion(database)).toBe(OFFLINE_SCHEMA_VERSION);
    const tables = await database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
    );
    expect(tables.map(({ name }) => name)).toEqual([
      'cached_content',
      'cached_papers',
      'cached_results',
      'cached_tests',
      'local_answers',
      'local_attempts',
      'sync_outbox',
    ]);

    const indexes = await database.getAllAsync<{ name: string }>(
      `SELECT name FROM sqlite_master
       WHERE type = 'index' AND name LIKE 'idx_%' ORDER BY name`,
    );
    expect(indexes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        'idx_cached_results_user_test',
        'idx_local_answers_attempt_sync',
        'idx_local_attempts_user_status',
        'idx_sync_outbox_due',
      ]),
    );
    await expect(
      database.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys'),
    ).resolves.toEqual({ foreign_keys: 1 });
  });

  it('does not rerun an applied migration or destroy existing rows', async () => {
    await initializeOfflineDatabase(database);
    await database.runAsync(
      'INSERT INTO cached_content (cache_key, version, payload_json, updated_at) VALUES (?, ?, ?, ?)',
      'current',
      'v1',
      '{}',
      NOW,
    );

    await initializeOfflineDatabase(database);

    await expect(
      database.getFirstAsync<{ version: string }>(
        'SELECT version FROM cached_content WHERE cache_key = ?',
        'current',
      ),
    ).resolves.toEqual({ version: 'v1' });
  });

  it('upgrades a Phase 1 database through all later durable migrations', async () => {
    await database.execAsync(OFFLINE_MIGRATIONS[0].sql);
    await database.execAsync('PRAGMA user_version = 1');
    await database.runAsync(
      `INSERT INTO local_attempts (
         user_id, id, test_id, started_at, ends_at, status, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      alice.userId,
      'phase-1-attempt',
      'test-pwt-07',
      NOW,
      NOW + 60_000,
      'running',
      NOW,
      NOW,
    );

    await initializeOfflineDatabase(database);

    await expect(getOfflineSchemaVersion(database)).resolves.toBe(4);
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'phase-1-attempt'),
    ).resolves.toMatchObject({
      currentQuestion: 1,
      currentQuestionId: undefined,
      currentEnteredAt: undefined,
      sectionUnlocked: [],
      submissionAttemptCount: 0,
      submissionAuto: false,
    });
  });

  it('upgrades a Phase 2 outbox in place with a race-safe revision', async () => {
    await database.execAsync(OFFLINE_MIGRATIONS[0].sql);
    await database.execAsync(OFFLINE_MIGRATIONS[1].sql);
    await database.execAsync('PRAGMA user_version = 2');
    await database.runAsync(
      `INSERT INTO local_attempts (
         user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      alice.userId,
      'phase-2-attempt',
      'test-pwt-07',
      'server-phase-2',
      NOW,
      NOW + 60_000,
      'running',
      NOW,
      NOW,
    );
    await database.runAsync(
      `INSERT INTO sync_outbox (
         user_id, id, attempt_id, operation, entity_key, payload_json, status,
         attempt_count, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      alice.userId,
      'phase-2-outbox',
      'phase-2-attempt',
      'patch_answer',
      'question-1',
      '{}',
      'pending',
      0,
      NOW,
      NOW,
    );

    await initializeOfflineDatabase(database);

    await expect(getOfflineSchemaVersion(database)).resolves.toBe(4);
    await expect(
      createOfflineRepositories(database).outbox.get(alice, 'phase-2-outbox'),
    ).resolves.toMatchObject({ revision: 0, status: 'pending' });
  });

  it('adds durable Phase 5 submission state without changing an existing attempt', async () => {
    await database.execAsync(OFFLINE_MIGRATIONS[0].sql);
    await database.execAsync(OFFLINE_MIGRATIONS[1].sql);
    await database.execAsync(OFFLINE_MIGRATIONS[2].sql);
    await database.execAsync('PRAGMA user_version = 3');
    await database.runAsync(
      `INSERT INTO local_attempts (
         user_id, id, test_id, server_attempt_id, started_at, ends_at, status,
         current_question, section_unlocked_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      alice.userId,
      'phase-4-attempt',
      'test-pwt-07',
      'server-phase-4',
      NOW,
      NOW + 60_000,
      'pending_submit',
      2,
      '[true]',
      NOW,
      NOW,
    );

    await initializeOfflineDatabase(database);

    await expect(getOfflineSchemaVersion(database)).resolves.toBe(4);
    await expect(
      createOfflineRepositories(database).attempts.get(alice, 'phase-4-attempt'),
    ).resolves.toMatchObject({
      status: 'pending_submit',
      serverAttemptId: 'server-phase-4',
      submissionAttemptCount: 0,
      submissionAuto: false,
    });
  });

  it('refuses to open a database created by a newer application version', async () => {
    await database.execAsync(`PRAGMA user_version = ${OFFLINE_SCHEMA_VERSION + 1}`);
    await expect(initializeOfflineDatabase(database)).rejects.toThrow('newer than supported');
  });

  it('opens, migrates and memoizes the Expo database through the lazy entry point', async () => {
    const openDatabaseAsync = jest.requireMock<{ openDatabaseAsync: jest.Mock }>(
      'expo-sqlite',
    ).openDatabaseAsync;
    openDatabaseAsync.mockResolvedValue(database);

    const first = await getOfflineDatabase();
    const second = await getOfflineDatabase();

    expect(first).toBe(second);
    expect(openDatabaseAsync).toHaveBeenCalledTimes(1);
    expect(await getOfflineSchemaVersion(first)).toBe(OFFLINE_SCHEMA_VERSION);
  });
});

describe('offline repositories', () => {
  let database: TestDatabase;
  let repositories: ReturnType<typeof createOfflineRepositories>;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    repositories = createOfflineRepositories(database);
  });

  afterEach(() => database.close());

  it('inserts, updates, reads and deletes content cache entries', async () => {
    await repositories.content.put({
      cacheKey: 'current',
      version: 'v1',
      payload: { notices: [] },
      updatedAt: NOW,
    });
    await repositories.content.put({
      cacheKey: 'current',
      version: 'v2',
      payload: { notices: ['notice-1'] },
      updatedAt: NOW + 1,
    });

    await expect(repositories.content.get<{ notices: string[] }>()).resolves.toEqual({
      cacheKey: 'current',
      version: 'v2',
      payload: { notices: ['notice-1'] },
      updatedAt: NOW + 1,
    });
    await expect(repositories.content.delete()).resolves.toBe(true);
    await expect(repositories.content.get()).resolves.toBeUndefined();
  });

  it('stores catalog rows and public papers under stable test IDs', async () => {
    await repositories.tests.put({
      testId: 'test-pwt-07',
      payload: { title: 'PWT 07' },
      sortOrder: 2,
      updatedAt: NOW,
    });
    await repositories.tests.put({
      testId: 'test-pwt-06',
      payload: { title: 'PWT 06' },
      sortOrder: 1,
      updatedAt: NOW,
    });
    await repositories.tests.put({
      testId: 'test-pwt-07',
      payload: { title: 'PWT 07 updated' },
      sortOrder: 2,
      updatedAt: NOW + 1,
    });
    await repositories.papers.put({
      testId: 'test-pwt-07',
      payload: [{ id: 'question-stable-1', options: ['A', 'B', 'C', 'D'] }],
      updatedAt: NOW,
    });
    await repositories.papers.put({
      testId: 'test-pwt-07',
      payload: [{ id: 'question-stable-1', options: ['A1', 'B1', 'C1', 'D1'] }],
      updatedAt: NOW + 1,
    });

    await expect(repositories.tests.list()).resolves.toMatchObject([
      { testId: 'test-pwt-06' },
      { testId: 'test-pwt-07', payload: { title: 'PWT 07 updated' } },
    ]);
    await expect(repositories.papers.get<{ id: string }[]>('test-pwt-07')).resolves.toMatchObject({
      testId: 'test-pwt-07',
      payload: [{ id: 'question-stable-1', options: ['A1', 'B1', 'C1', 'D1'] }],
      updatedAt: NOW + 1,
    });
    await expect(repositories.tests.delete('test-pwt-06')).resolves.toBe(true);
    await expect(repositories.papers.delete('test-pwt-07')).resolves.toBe(true);
  });

  it('keeps attempts isolated by user even when their local IDs are the same', async () => {
    await repositories.attempts.insert(attempt());
    await repositories.attempts.insert(
      attempt({ userId: bob.userId, serverAttemptId: 'server-attempt-bob' }),
    );

    await repositories.attempts.update(alice, 'local-attempt-1', {
      status: 'pending_submit',
      resultId: 'result-alice',
      updatedAt: NOW + 2,
    });

    await expect(repositories.attempts.get(alice, 'local-attempt-1')).resolves.toMatchObject({
      userId: alice.userId,
      status: 'pending_submit',
      resultId: 'result-alice',
    });
    await expect(repositories.attempts.get(bob, 'local-attempt-1')).resolves.toMatchObject({
      userId: bob.userId,
      status: 'running',
      resultId: undefined,
    });
    await expect(repositories.attempts.list(alice)).resolves.toHaveLength(1);
    await expect(repositories.attempts.delete(alice, 'local-attempt-1')).resolves.toBe(true);
    await expect(repositories.attempts.get(bob, 'local-attempt-1')).resolves.toBeDefined();
  });

  it('upserts and deletes answers by stable question ID within a user-scoped attempt', async () => {
    await repositories.attempts.insert(attempt());
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-stable-1',
      questionNo: 1,
      choice: 1,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty',
      updatedAt: NOW,
    });
    await repositories.answers.put({
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-stable-1',
      questionNo: 1,
      choice: 3,
      marked: true,
      visited: true,
      revision: 2,
      syncState: 'clean',
      updatedAt: NOW + 1,
    });

    await expect(
      repositories.answers.get(alice, 'local-attempt-1', 'question-stable-1'),
    ).resolves.toMatchObject({
      questionId: 'question-stable-1',
      choice: 3,
      marked: true,
      revision: 2,
      syncState: 'clean',
    });
    await expect(repositories.answers.list(alice, 'local-attempt-1')).resolves.toHaveLength(1);
    await expect(
      repositories.answers.delete(alice, 'local-attempt-1', 'question-stable-1'),
    ).resolves.toBe(true);
  });

  it('coalesces outbox operations and keeps queues isolated by user', async () => {
    await repositories.attempts.insert(attempt());
    await repositories.attempts.insert(
      attempt({ userId: bob.userId, serverAttemptId: 'server-attempt-bob' }),
    );
    await repositories.outbox.put(outbox());
    await repositories.outbox.put(
      outbox({ id: 'outbox-new-id', payload: { question_id: 'question-1', choice: 3 } }),
    );
    await repositories.outbox.put(
      outbox({
        userId: bob.userId,
        id: 'outbox-bob',
        payload: { question_id: 'question-1', choice: 0 },
      }),
    );

    await expect(repositories.outbox.list(alice)).resolves.toMatchObject([
      { id: 'outbox-1', payload: { question_id: 'question-1', choice: 3 } },
    ]);
    await expect(repositories.outbox.list(bob)).resolves.toMatchObject([
      { id: 'outbox-bob', payload: { question_id: 'question-1', choice: 0 } },
    ]);
    await expect(repositories.outbox.get(alice, 'outbox-1')).resolves.toMatchObject({
      payload: { question_id: 'question-1', choice: 3 },
    });
    await expect(repositories.outbox.delete(alice, 'outbox-1')).resolves.toBe(true);
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
  });

  it('stores authorized results by user and never returns another user result', async () => {
    await repositories.results.put({
      userId: alice.userId,
      resultId: 'result-shared-id',
      testId: 'test-pwt-07',
      attemptId: 'local-attempt-1',
      detail: { score: 80 },
      paper: [{ id: 'question-1', correct_choice: 2 }],
      updatedAt: NOW,
    });
    await repositories.results.put({
      userId: bob.userId,
      resultId: 'result-shared-id',
      testId: 'test-pwt-07',
      attemptId: 'local-attempt-1',
      detail: { score: 40 },
      updatedAt: NOW,
    });
    await repositories.results.put({
      userId: alice.userId,
      resultId: 'result-shared-id',
      testId: 'test-pwt-07',
      attemptId: 'local-attempt-1',
      detail: { score: 90 },
      paper: [{ id: 'question-1', correct_choice: 2 }],
      updatedAt: NOW + 1,
    });

    await expect(repositories.results.get(alice, 'result-shared-id')).resolves.toMatchObject({
      userId: alice.userId,
      detail: { score: 90 },
      paper: [{ id: 'question-1', correct_choice: 2 }],
      updatedAt: NOW + 1,
    });
    await expect(repositories.results.get(bob, 'result-shared-id')).resolves.toMatchObject({
      userId: bob.userId,
      detail: { score: 40 },
      paper: undefined,
    });
    await expect(repositories.results.list(alice)).resolves.toHaveLength(1);
    await expect(repositories.results.delete(alice, 'result-shared-id')).resolves.toBe(true);
    await expect(repositories.results.get(bob, 'result-shared-id')).resolves.toBeDefined();
  });

  it('enforces stable-ID uniqueness, answer constraints and cascading deletes', async () => {
    await repositories.attempts.insert(attempt());
    await expect(
      repositories.attempts.insert(attempt({ id: 'local-attempt-2' })),
    ).rejects.toThrow();

    const baseAnswer = {
      userId: alice.userId,
      attemptId: 'local-attempt-1',
      questionId: 'question-stable-1',
      questionNo: 1,
      choice: 2,
      marked: false,
      visited: true,
      revision: 1,
      syncState: 'dirty' as const,
      updatedAt: NOW,
    };
    await repositories.answers.put(baseAnswer);
    await expect(
      repositories.answers.put({ ...baseAnswer, questionId: 'question-other', choice: 9 }),
    ).rejects.toThrow();
    await expect(
      repositories.answers.put({ ...baseAnswer, questionId: 'question-other' }),
    ).rejects.toThrow();
    await repositories.outbox.put(outbox());

    await repositories.attempts.delete(alice, 'local-attempt-1');

    await expect(repositories.answers.list(alice, 'local-attempt-1')).resolves.toEqual([]);
    await expect(repositories.outbox.list(alice)).resolves.toEqual([]);
  });
});
