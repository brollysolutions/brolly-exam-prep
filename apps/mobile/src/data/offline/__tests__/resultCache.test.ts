import type {
  ApiV2Client,
  PaperQuestion,
  Result,
  ResultDetail,
  ReviewQuestion,
} from '@tslprb/api-contracts';

import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { PublicReadCache, resolveCachedRead } from '../readCache';
import { ResultReadCache } from '../resultCache';
import { createOfflineRepositories, type LocalAttempt } from '../repositories';

jest.unmock('../readCache');
jest.unmock('../resultCache');

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
const { join } = require('node:path') as { join: (...parts: string[]) => string };
const { tmpdir } = require('node:os') as { tmpdir: () => string };
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
const alice = { userId: 'user:alice' };
const bob = { userId: 'user:bob' };

const detail = (id = 'result-1', score = 78): ResultDetail => ({
  id,
  test_title_n: 7,
  title: { en: 'PWT Full Mock 07', te: 'PWT Full Mock 07' },
  score,
  max_score: 100,
  cutoff_pct: 40,
  qualified: true,
  rank: null,
  total_candidates: null,
  accuracy_pct: 80,
  avg_seconds_per_question: 42,
  negative_marks: -2,
  correct: 80,
  wrong: 8,
  skipped: 12,
  actions: [],
  review: [{ question_no: 1, your: 1, seconds: 35 }],
});

const review = (questionId = 'question-1'): ReviewQuestion[] => [
  {
    id: questionId,
    section: 'arithmetic',
    text: { en: 'Two plus two?', te: 'Two plus two?' },
    options: { en: ['1', '4', '3', '2'], te: ['1', '4', '3', '2'] },
    avg_seconds: 30,
    your_choice: 1,
    marked: true,
    correct_choice: 1,
    explanation: { en: 'Two and two make four.', te: 'Two and two make four.' },
    seconds: 35,
  },
];

const summary = (id = 'result-1', attemptId = 'server-attempt-1'): Result => ({
  id,
  test_id: 'test-pwt-07',
  attempt_id: attemptId,
  score: 78,
  max_score: 100,
  cutoff: 40,
  qualified: true,
  rank: null,
  accuracy: 80,
  per_section: [],
  wrong: [],
});

type ResultApi = Pick<
  ApiV2Client,
  'getResult' | 'getResultDetailResponse' | 'getResultPaper'
>;

function api(overrides: Partial<ResultApi> = {}): ResultApi {
  return {
    getResult: jest.fn(async (id: string) => summary(id)),
    getResultDetailResponse: jest.fn(async (id: string) => detail(id)),
    getResultPaper: jest.fn(async () => review()),
    ...overrides,
  };
}

function localAttempt(overrides: Partial<LocalAttempt> = {}): LocalAttempt {
  return {
    userId: alice.userId,
    id: 'local-attempt-1',
    testId: 'test-pwt-07',
    serverAttemptId: 'server-attempt-1',
    startedAt: NOW - 60_000,
    endsAt: NOW,
    status: 'submitted',
    resultId: 'result-1',
    currentQuestion: 1,
    currentQuestionId: 'question-1',
    sectionUnlocked: [true],
    submissionAttemptCount: 1,
    submissionAuto: false,
    createdAt: NOW - 60_000,
    updatedAt: NOW,
    ...overrides,
  };
}

describe('Phase 6 authorized result cache', () => {
  let database: TestDatabase;
  let repositories: ReturnType<typeof createOfflineRepositories>;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    repositories = createOfflineRepositories(database);
  });

  afterEach(() => database.close());

  it('caches validated detail and review against the Phase 5 result relationship', async () => {
    await repositories.attempts.insert(localAttempt());
    const cache = new ResultReadCache(api(), repositories, () => NOW + 1);

    await expect((await cache.readDetail(alice, 'result-1')).fresh).resolves.toMatchObject({
      id: 'result-1',
      score: 78,
    });
    await expect((await cache.readPaper(alice, 'result-1')).fresh).resolves.toMatchObject([
      { id: 'question-1', yourChoice: 1, correct: 1 },
    ]);

    await expect(repositories.results.getDetail<ResultDetail>(alice, 'result-1')).resolves.toMatchObject({
      testId: 'test-pwt-07',
      attemptId: 'local-attempt-1',
      payload: { id: 'result-1', score: 78 },
    });
    await expect(repositories.results.getPaper<ReviewQuestion[]>(alice, 'result-1')).resolves.toMatchObject({
      payload: [{ your_choice: 1, correct_choice: 1 }],
    });
  });

  it('loads cached detail and review offline, including selected/correct answers and explanation', async () => {
    await repositories.results.put({
      ...alice,
      resultId: 'result-1',
      testId: 'test-pwt-07',
      attemptId: 'local-attempt-1',
      detail: detail(),
      paper: review(),
      updatedAt: NOW,
    });
    const client = api({
      getResult: jest.fn(async () => Promise.reject(new Error('offline'))),
      getResultDetailResponse: jest.fn(async () => Promise.reject(new Error('offline'))),
      getResultPaper: jest.fn(async () => Promise.reject(new Error('offline'))),
    });
    const offline = new ResultReadCache(client, repositories);

    await expect(
      resolveCachedRead(offline.readDetail(alice, 'result-1', { refresh: false })),
    ).resolves.toMatchObject({ score: 78 });
    await expect(
      resolveCachedRead(offline.readPaper(alice, 'result-1', { refresh: false })),
    ).resolves.toMatchObject([
      {
        yourChoice: 1,
        correct: 1,
        explanation: { en: 'Two and two make four.' },
      },
    ]);
    expect(client.getResultDetailResponse).not.toHaveBeenCalled();
    expect(client.getResultPaper).not.toHaveBeenCalled();
  });

  it('returns a no-cache failure offline without calling the API', async () => {
    const client = api();
    const offline = new ResultReadCache(client, repositories);

    await expect(
      resolveCachedRead(offline.readDetail(alice, 'missing-result', { refresh: false })),
    ).rejects.toThrow('not cached');
    await expect(
      resolveCachedRead(offline.readPaper(alice, 'missing-result', { refresh: false })),
    ).rejects.toThrow('not cached');
    expect(client.getResultDetailResponse).not.toHaveBeenCalled();
    expect(client.getResultPaper).not.toHaveBeenCalled();
  });

  it('falls back to valid cached result data when an online refresh fails', async () => {
    await repositories.results.put({
      ...alice,
      resultId: 'result-1',
      testId: 'test-pwt-07',
      detail: detail(),
      paper: review(),
      updatedAt: NOW,
    });
    const unavailable = new ResultReadCache(
      api({
        getResultDetailResponse: jest.fn(async () => Promise.reject(new Error('server down'))),
        getResultPaper: jest.fn(async () => Promise.reject(new Error('server down'))),
      }),
      repositories,
    );

    const detailRead = await unavailable.readDetail(alice, 'result-1');
    expect(detailRead.cached?.score).toBe(78);
    await expect(detailRead.fresh).rejects.toThrow('server down');
    const paperRead = await unavailable.readPaper(alice, 'result-1');
    expect(paperRead.cached?.[0].correct).toBe(1);
    await expect(paperRead.fresh).rejects.toThrow('server down');
  });

  it('keeps valid cached data when fresh detail or paper is malformed', async () => {
    await repositories.results.put({
      ...alice,
      resultId: 'result-1',
      testId: 'test-pwt-07',
      detail: detail(),
      paper: review(),
      updatedAt: NOW,
    });
    const malformed = new ResultReadCache(
      api({
        getResultDetailResponse: jest.fn(async () => ({ id: 'result-1' }) as ResultDetail),
        getResultPaper: jest.fn(async () => [{ id: 'broken' }] as ReviewQuestion[]),
      }),
      repositories,
    );

    const detailRead = await malformed.readDetail(alice, 'result-1');
    expect(detailRead.cached?.score).toBe(78);
    await expect(detailRead.fresh).rejects.toThrow();
    const paperRead = await malformed.readPaper(alice, 'result-1');
    expect(paperRead.cached?.[0].explanation.en).toBe('Two and two make four.');
    await expect(paperRead.fresh).rejects.toThrow();

    await expect(repositories.results.getDetail<ResultDetail>(alice, 'result-1')).resolves.toMatchObject({
      payload: { score: 78 },
    });
    await expect(repositories.results.getPaper<ReviewQuestion[]>(alice, 'result-1')).resolves.toMatchObject({
      payload: [{ explanation: { en: 'Two and two make four.' } }],
    });
  });

  it('rejects malformed cached detail and removes the unusable result row', async () => {
    await database.runAsync(
      `INSERT INTO cached_results
       (user_id, result_id, test_id, detail_json, paper_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      alice.userId,
      'result-1',
      'test-pwt-07',
      '{bad-json',
      JSON.stringify(review()),
      NOW,
    );
    const offline = new ResultReadCache(
      api({ getResultDetailResponse: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );

    const read = await offline.readDetail(alice, 'result-1');
    expect(read.cached).toBeUndefined();
    await expect(read.fresh).rejects.toThrow('offline');
    await expect(repositories.results.getIdentity(alice, 'result-1')).resolves.toBeUndefined();
  });

  it('rejects only a malformed cached review and preserves valid result detail', async () => {
    await repositories.results.putDetail({
      ...alice,
      resultId: 'result-1',
      testId: 'test-pwt-07',
      detail: detail(),
      updatedAt: NOW,
    });
    await database.runAsync(
      `UPDATE cached_results SET paper_json = ? WHERE user_id = ? AND result_id = ?`,
      '{bad-json',
      alice.userId,
      'result-1',
    );
    const offline = new ResultReadCache(
      api({ getResultPaper: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );

    const read = await offline.readPaper(alice, 'result-1');
    expect(read.cached).toBeUndefined();
    await expect(read.fresh).rejects.toThrow('offline');
    await expect(repositories.results.getDetail(alice, 'result-1')).resolves.toBeDefined();
    await expect(repositories.results.getPaper(alice, 'result-1')).resolves.toBeUndefined();
  });

  it('never returns another user cache and keeps multiple results isolated', async () => {
    for (const [scope, id, score] of [
      [alice, 'result-1', 78],
      [alice, 'result-2', 55],
      [bob, 'result-1', 12],
    ] as const) {
      await repositories.results.putDetail({
        ...scope,
        resultId: id,
        testId: `test-${id}`,
        detail: detail(id, score),
        updatedAt: NOW,
      });
    }
    const offline = new ResultReadCache(
      api({ getResultDetailResponse: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );

    await expect(resolveCachedRead(offline.readDetail(alice, 'result-1'))).resolves.toMatchObject({ score: 78 });
    await expect(resolveCachedRead(offline.readDetail(alice, 'result-2'))).resolves.toMatchObject({ score: 55 });
    await expect(resolveCachedRead(offline.readDetail(bob, 'result-1'))).resolves.toMatchObject({ score: 12 });
    await expect(resolveCachedRead(offline.readDetail(bob, 'result-2'))).rejects.toThrow('offline');
  });

  it('uses the existing result summary only when an older result has no Phase 5 local link', async () => {
    const client = api();
    const cache = new ResultReadCache(client, repositories, () => NOW);

    await (await cache.readDetail(alice, 'legacy-result')).fresh;

    expect(client.getResult).toHaveBeenCalledWith('legacy-result');
    await expect(repositories.results.getIdentity(alice, 'legacy-result')).resolves.toMatchObject({
      testId: 'test-pwt-07',
      attemptId: 'server-attempt-1',
    });
  });

  it('restores the authorized result from the same SQLite file after app restart', async () => {
    database.close();
    const path = join(tmpdir(), `brolly-offline-phase6-${Date.now()}-${Math.random()}.db`);
    const first = new TestDatabase(path);
    try {
      await initializeOfflineDatabase(first);
      const firstRepositories = createOfflineRepositories(first);
      const online = new ResultReadCache(api(), firstRepositories, () => NOW);
      await (await online.readDetail(alice, 'result-1')).fresh;
      await (await online.readPaper(alice, 'result-1')).fresh;
      first.close();

      const reopened = new TestDatabase(path);
      try {
        await initializeOfflineDatabase(reopened);
        const offline = new ResultReadCache(
          api({
            getResultDetailResponse: jest.fn(async () => Promise.reject(new Error('offline'))),
            getResultPaper: jest.fn(async () => Promise.reject(new Error('offline'))),
          }),
          createOfflineRepositories(reopened),
        );
        await expect(resolveCachedRead(offline.readDetail(alice, 'result-1'))).resolves.toMatchObject({ score: 78 });
        await expect(resolveCachedRead(offline.readPaper(alice, 'result-1'))).resolves.toHaveLength(1);
      } finally {
        reopened.close();
      }
    } finally {
      try {
        first.close();
      } catch {}
      unlinkSync(path);
      database = new TestDatabase();
    }
  });

  it('keeps the public pre-submit paper cache free of answer keys and explanations', async () => {
    const unsafe = review().map(({ your_choice: _your, marked: _marked, correct_choice: _correct, explanation: _explanation, seconds: _seconds, ...question }) => question) as PaperQuestion[];
    const withHiddenFields = unsafe.map((question) => ({
      ...question,
      correct_choice: 1,
      explanation: { en: 'Hidden', te: 'Hidden' },
    })) as unknown as PaperQuestion[];
    const publicCache = new PublicReadCache(
      {
        getContent: jest.fn(),
        listTestCatalog: jest.fn(),
        getTestMetaResponse: jest.fn(),
        getTestPaper: jest.fn(async () => withHiddenFields),
      },
      repositories,
      () => NOW,
    );

    await (await publicCache.readTestPaper('test-pwt-07')).fresh;
    const stored = await repositories.papers.get<Record<string, unknown>[]>('test-pwt-07');
    expect(stored?.payload[0]).not.toHaveProperty('correct_choice');
    expect(stored?.payload[0]).not.toHaveProperty('explanation');
  });
});
