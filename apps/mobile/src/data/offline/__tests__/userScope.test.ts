import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { createOfflineRepositories, type LocalAttempt, type UserScope } from '../repositories';
import { reconcileLocalUserScope } from '../userScope';

jest.unmock('../userScope');

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
const PHONE = 'phone:2222222222';
const USER = 'user:abc-123';

function attempt(userId: string, id: string, overrides: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    userId,
    id,
    testId: 'test-pwt-07',
    serverAttemptId: undefined,
    startedAt: NOW,
    endsAt: NOW + 60_000,
    status: 'pending_submit',
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

describe('offline user-scope reconciliation', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
  });

  afterEach(() => database.close());

  async function seedPhoneScopedAttempt(scope: UserScope = { userId: PHONE }) {
    const repositories = createOfflineRepositories(database);
    await repositories.attempts.insert(attempt(scope.userId, 'local-1'));
    await repositories.answers.put({
      userId: scope.userId,
      attemptId: 'local-1',
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
      userId: scope.userId,
      id: 'answer:local-1:question-1',
      attemptId: 'local-1',
      operation: 'patch_answer',
      entityKey: 'question-1',
      revision: 1,
      payload: { question_id: 'question-1', choice: 2, marked: false, revision: 1 },
      status: 'pending',
      attemptCount: 0,
      createdAt: NOW,
      updatedAt: NOW,
    });
  }

  it('re-owns a phone-scoped attempt and its children under the signed-in user', async () => {
    await seedPhoneScopedAttempt();

    await expect(reconcileLocalUserScope(database, PHONE, USER)).resolves.toEqual({
      migrated: true,
      attempts: 1,
    });

    const repositories = createOfflineRepositories(database);
    await expect(repositories.attempts.get({ userId: PHONE }, 'local-1')).resolves.toBeUndefined();
    await expect(repositories.attempts.get({ userId: USER }, 'local-1')).resolves.toMatchObject({
      id: 'local-1',
      status: 'pending_submit',
    });
    await expect(repositories.answers.list({ userId: USER }, 'local-1')).resolves.toHaveLength(1);
    await expect(repositories.outbox.list({ userId: USER })).resolves.toHaveLength(1);
  });

  it('never merges into a user scope that already holds data', async () => {
    await seedPhoneScopedAttempt();
    await createOfflineRepositories(database).attempts.insert(attempt(USER, 'existing-user-attempt'));

    await expect(reconcileLocalUserScope(database, PHONE, USER)).resolves.toEqual({
      migrated: false,
      attempts: 0,
    });

    const repositories = createOfflineRepositories(database);
    // The phone-scoped data is left intact rather than clobbering the other account.
    await expect(repositories.attempts.get({ userId: PHONE }, 'local-1')).resolves.toMatchObject({
      id: 'local-1',
    });
  });

  it('is a no-op when there is nothing under the phone scope', async () => {
    await expect(reconcileLocalUserScope(database, PHONE, USER)).resolves.toEqual({
      migrated: false,
      attempts: 0,
    });
  });

  it('is a no-op when the scopes are identical', async () => {
    await seedPhoneScopedAttempt({ userId: USER });
    await expect(reconcileLocalUserScope(database, USER, USER)).resolves.toEqual({
      migrated: false,
      attempts: 0,
    });
    await expect(
      createOfflineRepositories(database).attempts.get({ userId: USER }, 'local-1'),
    ).resolves.toMatchObject({ id: 'local-1' });
  });
});
