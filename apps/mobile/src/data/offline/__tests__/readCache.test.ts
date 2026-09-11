import type {
  ApiV2Client,
  Content,
  PaperQuestion,
  TestMeta,
} from '@tslprb/api-contracts';

import {
  initializeOfflineDatabase,
  type OfflineDatabase,
  type SqlRunResult,
  type SqlValue,
} from '../database';
import { PublicReadCache, resolveCachedRead } from '../readCache';
import { createOfflineRepositories } from '../repositories';

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

const content = (version = 'content-v1'): Content => ({
  version,
  notices: [],
  affairs: [],
  study_sections: [],
  exam_info: { pwt_date: '2026-10-01', label: { en: 'PWT', te: 'PWT' } },
  categories: [],
  cost_rows: { en: [], te: [] },
  physical_standards: [],
  standards_notification_year: 2026,
});

const meta = (id: string, title = id): TestMeta => ({
  id,
  kind: 'full',
  title: { en: title, te: title },
  pattern: {
    id: `pattern-${id}`,
    post: 'pc',
    total_questions: 1,
    duration_minutes: 60,
    marks_per_correct: 1,
    negative_per_wrong: 0.25,
    qualifying_only: false,
    sections: [{ id: 'arithmetic', label_key: 'test.sections.arithmetic', questions: 1 }],
    verified: true,
    source: 'TSLPRB',
  },
  full_mocks_only: false,
  listed: true,
  free: true,
  attempted: null,
});

const paper = (id: string): PaperQuestion[] => [
  {
    id: `question-${id}`,
    section: 'arithmetic',
    text: { en: 'Two plus two?', te: 'Two plus two?' },
    options: { en: ['1', '2', '3', '4'], te: ['1', '2', '3', '4'] },
    avg_seconds: 30,
  },
];

type PublicApi = Pick<
  ApiV2Client,
  'getContent' | 'listTestCatalog' | 'getTestMetaResponse' | 'getTestPaper'
>;

function api(overrides: Partial<PublicApi> = {}): PublicApi {
  return {
    getContent: jest.fn(async () => content()),
    listTestCatalog: jest.fn(async () => [meta('test-pwt-07')]),
    getTestMetaResponse: jest.fn(async (id: string) => meta(id)),
    getTestPaper: jest.fn(async (id: string) => paper(id)),
    ...overrides,
  };
}

describe('Phase 2 public read cache', () => {
  let database: TestDatabase;
  let repositories: ReturnType<typeof createOfflineRepositories>;

  beforeEach(async () => {
    database = new TestDatabase();
    await initializeOfflineDatabase(database);
    repositories = createOfflineRepositories(database);
  });

  afterEach(() => database.close());

  it('caches validated content with its server version and falls back to it', async () => {
    const online = new PublicReadCache(api(), repositories, () => NOW);
    const first = await online.readContent();
    expect(first.cached).toBeUndefined();
    await expect(first.fresh).resolves.toEqual(content());
    await expect(repositories.content.get<Content>()).resolves.toMatchObject({
      version: 'content-v1',
      payload: content(),
      updatedAt: NOW,
    });

    const offline = new PublicReadCache(
      api({ getContent: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );
    await expect(resolveCachedRead(offline.readContent())).resolves.toEqual(content());
  });

  it('reports the network failure when offline content has never been cached', async () => {
    const offline = new PublicReadCache(
      api({ getContent: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );
    await expect(resolveCachedRead(offline.readContent())).rejects.toThrow('offline');
  });

  it('preserves stable catalog IDs and replaces stale catalog data idempotently', async () => {
    await repositories.tests.replaceCatalog([
      { testId: 'test-pwt-07', payload: meta('test-pwt-07', 'Old'), sortOrder: 0, updatedAt: 1 },
      { testId: 'removed-test', payload: meta('removed-test'), sortOrder: 1, updatedAt: 1 },
    ]);
    const freshCatalog = [meta('test-pwt-07', 'Fresh'), meta('test-pwt-08')];
    const cache = new PublicReadCache(
      api({ listTestCatalog: jest.fn(async () => freshCatalog) }),
      repositories,
      () => NOW,
    );

    const read = await cache.readTestCatalog();
    expect(read.cached?.map((test) => test.id)).toEqual(['test-pwt-07', 'removed-test']);
    await expect(read.fresh).resolves.toMatchObject([
      { id: 'test-pwt-07', title: { en: 'Fresh' } },
      { id: 'test-pwt-08' },
    ]);
    await expect(repositories.tests.listCatalog<TestMeta>()).resolves.toMatchObject([
      { testId: 'test-pwt-07', sortOrder: 0 },
      { testId: 'test-pwt-08', sortOrder: 1 },
    ]);

    await (await cache.readTestCatalog()).fresh;
    await expect(repositories.tests.listCatalog()).resolves.toHaveLength(2);
  });

  it('falls back to the cached catalog when its refresh fails', async () => {
    await repositories.tests.replaceCatalog([
      { testId: 'test-pwt-07', payload: meta('test-pwt-07'), sortOrder: 0, updatedAt: 1 },
    ]);
    const offline = new PublicReadCache(
      api({ listTestCatalog: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );

    await expect(resolveCachedRead(offline.readTestCatalog())).resolves.toMatchObject([
      { id: 'test-pwt-07' },
    ]);
  });

  it('returns cached metadata first and replaces it with a fresh response', async () => {
    await repositories.tests.put({
      testId: 'test-pwt-07',
      payload: meta('test-pwt-07', 'Stale'),
      sortOrder: 3,
      updatedAt: 1,
    });
    const cache = new PublicReadCache(
      api({ getTestMetaResponse: jest.fn(async () => meta('test-pwt-07', 'Fresh')) }),
      repositories,
      () => NOW,
    );

    const read = await cache.readTestMeta('test-pwt-07');
    expect(read.cached?.title.en).toBe('Stale');
    await expect(read.fresh).resolves.toMatchObject({ title: { en: 'Fresh' } });
    await expect(repositories.tests.get<TestMeta>('test-pwt-07')).resolves.toMatchObject({
      testId: 'test-pwt-07',
      sortOrder: 3,
      payload: { title: { en: 'Fresh' } },
    });
  });

  it('keeps metadata-only test IDs out of the cached catalog', async () => {
    const cache = new PublicReadCache(api(), repositories, () => NOW);
    await (await cache.readTestMeta('meta-only-test')).fresh;

    await expect(repositories.tests.get('meta-only-test')).resolves.toMatchObject({
      testId: 'meta-only-test',
      sortOrder: -1,
    });
    await expect(repositories.tests.listCatalog()).resolves.toEqual([]);
  });

  it('caches separate public papers and serves either one offline', async () => {
    const online = new PublicReadCache(api(), repositories, () => NOW);
    await (await online.readTestPaper('test-pwt-07')).fresh;
    await (await online.readTestPaper('test-pwt-08')).fresh;

    const offline = new PublicReadCache(
      api({ getTestPaper: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );
    await expect(resolveCachedRead(offline.readTestPaper('test-pwt-07'))).resolves.toMatchObject([
      { id: 'question-test-pwt-07' },
    ]);
    await expect(resolveCachedRead(offline.readTestPaper('test-pwt-08'))).resolves.toMatchObject([
      { id: 'question-test-pwt-08' },
    ]);
  });

  it('strips answer and explanation fields before a public paper reaches SQLite', async () => {
    const unsafe = paper('test-pwt-07').map((question) => ({
      ...question,
      correct_choice: 3,
      explanation: { en: 'Hidden', te: 'Hidden' },
      scoring_weight: 10,
    })) as unknown as PaperQuestion[];
    const cache = new PublicReadCache(
      api({ getTestPaper: jest.fn(async () => unsafe) }),
      repositories,
      () => NOW,
    );

    await (await cache.readTestPaper('test-pwt-07')).fresh;
    const stored = await repositories.papers.get<Record<string, unknown>[]>('test-pwt-07');
    expect(stored?.payload[0]).not.toHaveProperty('correct_choice');
    expect(stored?.payload[0]).not.toHaveProperty('explanation');
    expect(stored?.payload[0]).not.toHaveProperty('scoring_weight');
  });

  it('deletes malformed cached JSON and uses the normal no-cache failure path', async () => {
    await database.runAsync(
      `INSERT INTO cached_papers (test_id, payload_json, updated_at) VALUES (?, ?, ?)`,
      'test-pwt-07',
      '{not-json',
      NOW,
    );
    const offline = new PublicReadCache(
      api({ getTestPaper: jest.fn(async () => Promise.reject(new Error('offline'))) }),
      repositories,
    );

    const read = await offline.readTestPaper('test-pwt-07');
    expect(read.cached).toBeUndefined();
    await expect(read.fresh).rejects.toThrow('offline');
    await expect(repositories.papers.get('test-pwt-07')).resolves.toBeUndefined();
  });
});
