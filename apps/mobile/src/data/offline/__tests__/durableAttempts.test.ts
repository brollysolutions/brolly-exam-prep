import type { ApiV2Client, Content, PaperQuestion, TestMeta } from '@tslprb/api-contracts';

import { useAttemptStore, type Choice } from '../../attempt';
import { remainingMs } from '../../attempt.selectors';
import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { DurableAttemptService } from '../durableAttempts';
import { PublicReadCache } from '../readCache';
import { createOfflineRepositories } from '../repositories';

jest.unmock('../durableAttempts');
jest.unmock('../readCache');

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

const rawMeta: TestMeta = {
  id: 'test-pwt-07',
  kind: 'full',
  title: { en: 'PWT Full Mock 07', te: 'PWT Full Mock 07' },
  pattern: {
    id: 'pattern-pwt',
    post: 'pc',
    total_questions: 2,
    duration_minutes: 150,
    marks_per_correct: 1,
    negative_per_wrong: 0.25,
    qualifying_only: false,
    sections: [{ id: 'arithmetic', label_key: 'test.sections.arithmetic', questions: 2 }],
    verified: true,
    source: 'TSLPRB',
  },
  full_mocks_only: false,
  listed: true,
  free: true,
  attempted: null,
};

const rawPaper: PaperQuestion[] = [1, 2].map((number) => ({
  id: `question-stable-${number}`,
  section: 'arithmetic',
  text: { en: `Question ${number}`, te: `Question ${number}` },
  options: { en: ['A', 'B', 'C', 'D'], te: ['A', 'B', 'C', 'D'] },
  avg_seconds: 30,
}));

type PublicApi = Pick<
  ApiV2Client,
  'getContent' | 'listTestCatalog' | 'getTestMetaResponse' | 'getTestPaper'
>;

const emptyContent: Content = {
  version: 'test',
  notices: [],
  affairs: [],
  study_sections: [],
  exam_info: { pwt_date: '', label: { en: '', te: '' } },
  categories: [],
  cost_rows: { en: [], te: [] },
  physical_standards: [],
  standards_notification_year: 0,
};

function api(online: boolean): PublicApi {
  const unavailable = async (): Promise<never> => {
    throw new Error('offline');
  };
  return {
    getContent: online ? async () => emptyContent : unavailable,
    listTestCatalog: online ? async () => [rawMeta] : unavailable,
    getTestMetaResponse: online ? async () => rawMeta : unavailable,
    getTestPaper: online ? async () => rawPaper : unavailable,
  };
}

async function service(database: OfflineDatabase, online = false) {
  const cache = new PublicReadCache(api(online), createOfflineRepositories(database), () => NOW);
  if (online) {
    await (await cache.readTestMeta(rawMeta.id)).fresh;
    await (await cache.readTestPaper(rawMeta.id)).fresh;
  }
  let sequence = 0;
  return new DurableAttemptService(database, cache, () => NOW, (_testId, now) => {
    sequence += 1;
    return `local-${now}-${sequence}`;
  });
}

describe('Phase 3 durable attempts', () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    useAttemptStore.getState().reset();
  });

  afterEach(() => database.close());

  it('creates unique local attempts with stable test IDs and user scope', async () => {
    const durable = await service(database, true);
    const bundle = await durable.restore(
      alice,
      (
        await durable.create({
          scope: alice,
          test: (await (await new PublicReadCache(api(true)).readTestMeta(rawMeta.id)).fresh),
          paper: (await (await new PublicReadCache(api(true)).readTestPaper(rawMeta.id)).fresh),
        })
      ).id,
    );
    const second = await durable.create({
      scope: alice,
      test: bundle!.meta,
      paper: bundle!.paper,
      serverAttemptId: 'server-attempt-2',
    });

    expect(bundle?.attempt).toMatchObject({
      userId: alice.userId,
      testId: 'test-pwt-07',
      currentQuestionId: 'question-stable-1',
    });
    expect(second.id).not.toBe(bundle?.attempt.id);
    expect(second.serverAttemptId).toBe('server-attempt-2');
  });

  it('updates one stable question row and preserves marked and visited state', async () => {
    const durable = await service(database, true);
    const cached = await durable.restore(
      alice,
      (
        await durable.create({
          scope: alice,
          test: (await (await new PublicReadCache(api(true)).readTestMeta(rawMeta.id)).fresh),
          paper: (await (await new PublicReadCache(api(true)).readTestPaper(rawMeta.id)).fresh),
        })
      ).id,
    );
    const attemptId = cached!.attempt.id;
    await durable.saveProgress({
      scope: alice,
      attemptId,
      currentQuestion: 1,
      currentQuestionId: 'question-stable-1',
      currentEnteredAt: NOW + 1_000,
      sectionUnlocked: [true],
      choice: 1,
      marked: true,
      visited: true,
    });
    await durable.saveProgress({
      scope: alice,
      attemptId,
      currentQuestion: 1,
      currentQuestionId: 'question-stable-1',
      currentEnteredAt: NOW + 1_000,
      sectionUnlocked: [true],
      choice: 3,
      marked: true,
      visited: true,
    });

    const reloaded = await service(database);
    const restored = await reloaded.restore(alice, attemptId);
    expect(restored?.answers).toHaveLength(1);
    expect(restored?.answers[0]).toMatchObject({
      questionId: 'question-stable-1',
      choice: 3,
      marked: true,
      visited: true,
      revision: 2,
    });
  });

  it('keeps answers separate across two attempts for the same test', async () => {
    const durable = await service(database, true);
    const cache = new PublicReadCache(api(true));
    const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
    const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
    const first = await durable.create({ scope: alice, test, paper });
    const second = await durable.create({ scope: alice, test, paper });

    await durable.saveProgress({
      scope: alice,
      attemptId: first.id,
      currentQuestion: 1,
      currentQuestionId: paper[0].id,
      sectionUnlocked: [true],
      choice: 1,
      marked: false,
      visited: true,
    });
    await durable.saveProgress({
      scope: alice,
      attemptId: second.id,
      currentQuestion: 1,
      currentQuestionId: paper[0].id,
      sectionUnlocked: [true],
      choice: 3,
      marked: false,
      visited: true,
    });

    const repositories = createOfflineRepositories(database);
    await expect(repositories.answers.get(alice, first.id, paper[0].id)).resolves.toMatchObject({
      choice: 1,
    });
    await expect(repositories.answers.get(alice, second.id, paper[0].id)).resolves.toMatchObject({
      choice: 3,
    });
  });

  it('restores paper, answer, current question, navigation and absolute deadline offline', async () => {
    const durable = await service(database, true);
    const cache = new PublicReadCache(api(true));
    const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
    const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
    const attempt = await durable.create({
      scope: alice,
      test,
      paper,
      startedAt: NOW,
      endsAt: NOW + 9_000_000,
    });
    await durable.saveProgress({
      scope: alice,
      attemptId: attempt.id,
      currentQuestion: 1,
      currentQuestionId: paper[0].id,
      sectionUnlocked: [true],
      choice: 2,
      marked: false,
      visited: true,
    });
    await durable.saveProgress({
      scope: alice,
      attemptId: attempt.id,
      currentQuestion: 2,
      currentQuestionId: paper[1].id,
      currentEnteredAt: NOW + 20_000,
      sectionUnlocked: [true],
      choice: null,
      marked: true,
      visited: true,
    });

    const restarted = await service(database);
    const restored = await restarted.restore(alice, attempt.id);
    expect(restored?.paper.map((question) => question.id)).toEqual([
      'question-stable-1',
      'question-stable-2',
    ]);
    useAttemptStore.getState().reset();
    useAttemptStore
      .getState()
      .hydrateLocal(restored!.meta, restored!.attempt, restored!.answers, restored!.paper);
    expect(useAttemptStore.getState()).toMatchObject({
      attemptId: attempt.id,
      current: 2,
      answers: { 1: 2 },
      marked: { 2: true },
      visited: { 1: true, 2: true },
      endsAt: NOW + 9_000_000,
    });
    expect(remainingMs(useAttemptStore.getState(), NOW + 3_000_000)).toBe(6_000_000);
  });

  it('does not reset or extend an expired deadline', async () => {
    const durable = await service(database, true);
    const cache = new PublicReadCache(api(true));
    const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
    const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
    const attempt = await durable.create({
      scope: alice,
      test,
      paper,
      startedAt: NOW,
      endsAt: NOW + 1_000,
    });
    const restored = await durable.restore(alice, attempt.id);

    expect(restored?.attempt.endsAt).toBe(NOW + 1_000);
    expect(remainingMs({ ...useAttemptStore.getState(), endsAt: restored!.attempt.endsAt }, NOW + 2_000)).toBe(0);
  });

  it('never returns another user\'s unfinished attempt', async () => {
    const durable = await service(database, true);
    const cache = new PublicReadCache(api(true));
    const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
    const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
    const attempt = await durable.create({ scope: alice, test, paper });

    await expect(durable.findLatest(bob)).resolves.toBeUndefined();
    await expect(durable.restore(bob, attempt.id)).resolves.toBeUndefined();
  });

  it('rolls back navigation when the answer row violates a constraint', async () => {
    const durable = await service(database, true);
    const cache = new PublicReadCache(api(true));
    const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
    const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
    const attempt = await durable.create({ scope: alice, test, paper });

    await expect(
      durable.saveProgress({
        scope: alice,
        attemptId: attempt.id,
        currentQuestion: 2,
        currentQuestionId: paper[1].id,
        sectionUnlocked: [true],
        choice: 9 as Choice,
        marked: false,
        visited: true,
      }),
    ).rejects.toThrow();
    await expect(createOfflineRepositories(database).attempts.get(alice, attempt.id)).resolves.toMatchObject({
      currentQuestion: 1,
      currentQuestionId: paper[0].id,
    });
    await expect(
      createOfflineRepositories(database).answers.get(alice, attempt.id, paper[1].id),
    ).resolves.toBeUndefined();
  });

  it('survives closing and reopening the SQLite database with no network', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-phase3-${Date.now()}-${Math.random()}.db`);
    const firstDatabase = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(firstDatabase);
      const firstService = await service(firstDatabase, true);
      const cache = new PublicReadCache(api(true));
      const test = await (await cache.readTestMeta(rawMeta.id)).fresh;
      const paper = await (await cache.readTestPaper(rawMeta.id)).fresh;
      const attempt = await firstService.create({ scope: alice, test, paper });
      await firstService.saveProgress({
        scope: alice,
        attemptId: attempt.id,
        currentQuestion: 2,
        currentQuestionId: paper[1].id,
        sectionUnlocked: [true],
        choice: 0,
        marked: true,
        visited: true,
      });
      firstDatabase.close();

      const secondDatabase = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(secondDatabase);
        const secondService = await service(secondDatabase);
        const restored = await secondService.restore(alice, attempt.id);
        expect(restored).toMatchObject({
          attempt: { id: attempt.id, currentQuestion: 2, endsAt: attempt.endsAt },
          answers: expect.arrayContaining([
            expect.objectContaining({ questionId: paper[1].id, choice: 0, marked: true }),
          ]),
        });
      } finally {
        secondDatabase.close();
      }
    } finally {
      try {
        firstDatabase.close();
      } catch {
        // It was already closed before simulating the restart.
      }
      unlinkSync(path);
      database = new TestDatabase();
    }
  });
});
