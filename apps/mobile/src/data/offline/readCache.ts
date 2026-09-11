import {
  ContentSchema,
  PaperQuestionSchema,
  TestMetaSchema,
  type ApiV2Client,
  type Content,
  type PaperQuestion as ApiPaperQuestion,
  type TestMeta as ApiTestMeta,
} from '@tslprb/api-contracts';
import type { TestMeta } from '@tslprb/fixtures';
import { z } from 'zod';

import { getApi } from '../api';
import { mapPaperQuestion, mapTestMeta } from '../api/mappers';
import type { PaperQuestion } from '../api/types';
import { getOfflineDatabase } from './database';
import { createOfflineRepositories } from './repositories';

const CONTENT_CACHE_KEY = 'current';
const METADATA_ONLY_SORT_ORDER = -1;
const TestCatalogSchema = z.array(TestMetaSchema);
const TestPaperSchema = z.array(PaperQuestionSchema);

type PublicReadApi = Pick<
  ApiV2Client,
  'getContent' | 'listTestCatalog' | 'getTestMetaResponse' | 'getTestPaper'
>;
type OfflineRepositories = ReturnType<typeof createOfflineRepositories>;

export type CachedRead<T> = {
  /** Valid cached data, available before the network refresh settles. */
  cached?: T;
  /** A fresh response. Consumers may keep `cached` if this rejects. */
  fresh: Promise<T>;
};

export type CachedTestBundle = { meta: TestMeta; questions: PaperQuestion[] };

function uniqueIds<T extends { id: string }>(values: T[], context: string): T[] {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) throw new Error(`${context} contains duplicate id ${value.id}`);
    ids.add(value.id);
  }
  return values;
}

/**
 * Public, cache-first reads only. Attempt, answer and result methods deliberately do not
 * exist here: those records require authorization and later synchronization phases.
 */
export class PublicReadCache {
  constructor(
    private readonly api: PublicReadApi,
    private readonly repositories?: OfflineRepositories,
    private readonly now: () => number = Date.now,
  ) {}

  async readContent(): Promise<CachedRead<Content>> {
    let cached: Content | undefined;
    if (this.repositories) {
      try {
        const entry = await this.repositories.content.get<unknown>(CONTENT_CACHE_KEY);
        if (entry) cached = ContentSchema.parse(entry.payload);
      } catch {
        await this.repositories.content.delete(CONTENT_CACHE_KEY).catch(() => undefined);
      }
    }

    const fresh = (async () => {
      const content = ContentSchema.parse(await this.api.getContent());
      if (this.repositories) {
        await this.repositories.content
          .put({
            cacheKey: CONTENT_CACHE_KEY,
            version: content.version,
            payload: content,
            updatedAt: this.now(),
          })
          .catch(() => undefined);
      }
      return content;
    })();
    return { cached, fresh };
  }

  async readTestCatalog(): Promise<CachedRead<TestMeta[]>> {
    let cached: TestMeta[] | undefined;
    if (this.repositories) {
      try {
        const entries = await this.repositories.tests.listCatalog<unknown>();
        if (entries.length > 0) {
          const raw = uniqueIds(
            entries.map((entry) => {
              const parsed = TestMetaSchema.parse(entry.payload);
              if (parsed.id !== entry.testId) throw new Error('Cached test id mismatch');
              return parsed;
            }),
            'Cached catalog',
          );
          cached = raw.map(mapTestMeta);
        }
      } catch {
        await this.repositories.tests.replaceCatalog([]).catch(() => undefined);
      }
    }

    const fresh = (async () => {
      const raw = uniqueIds(TestCatalogSchema.parse(await this.api.listTestCatalog()), 'Catalog');
      const mapped = raw.map(mapTestMeta);
      if (this.repositories) {
        const updatedAt = this.now();
        await this.repositories.tests
          .replaceCatalog(
            raw.map((test, sortOrder) => ({
              testId: test.id,
              payload: test,
              sortOrder,
              updatedAt,
            })),
          )
          .catch(() => undefined);
      }
      return mapped;
    })();
    return { cached, fresh };
  }

  async readTestMeta(testId: string): Promise<CachedRead<TestMeta>> {
    let cached: TestMeta | undefined;
    let cachedSortOrder = METADATA_ONLY_SORT_ORDER;
    if (this.repositories) {
      try {
        const entry = await this.repositories.tests.get<unknown>(testId);
        if (entry) {
          const parsed = TestMetaSchema.parse(entry.payload);
          if (parsed.id !== testId) throw new Error('Cached test id mismatch');
          cached = mapTestMeta(parsed);
          cachedSortOrder = entry.sortOrder;
        }
      } catch {
        await this.repositories.tests.delete(testId).catch(() => undefined);
      }
    }

    const fresh = (async () => {
      const raw = TestMetaSchema.parse(await this.api.getTestMetaResponse(testId));
      if (raw.id !== testId) throw new Error('Test metadata id does not match the request');
      const mapped = mapTestMeta(raw);
      if (this.repositories) {
        await this.repositories.tests
          .put({
            testId,
            payload: raw,
            sortOrder: cachedSortOrder,
            updatedAt: this.now(),
          })
          .catch(() => undefined);
      }
      return mapped;
    })();
    return { cached, fresh };
  }

  async readTestPaper(testId: string): Promise<CachedRead<PaperQuestion[]>> {
    let cached: PaperQuestion[] | undefined;
    if (this.repositories) {
      try {
        const entry = await this.repositories.papers.get<unknown>(testId);
        if (entry) {
          const raw = uniqueIds(TestPaperSchema.parse(entry.payload), 'Cached paper');
          cached = raw.map(mapPaperQuestion);
        }
      } catch {
        await this.repositories.papers.delete(testId).catch(() => undefined);
      }
    }

    const fresh = (async () => {
      // Parsing with the public contract strips unknown fields before anything reaches disk.
      const raw: ApiPaperQuestion[] = uniqueIds(
        TestPaperSchema.parse(await this.api.getTestPaper(testId)),
        'Paper',
      );
      const mapped = raw.map(mapPaperQuestion);
      if (this.repositories) {
        await this.repositories.papers
          .put({ testId, payload: raw, updatedAt: this.now() })
          .catch(() => undefined);
      }
      return mapped;
    })();
    return { cached, fresh };
  }

  async readTestBundle(testId: string): Promise<CachedRead<CachedTestBundle>> {
    const [meta, paper] = await Promise.all([
      this.readTestMeta(testId),
      this.readTestPaper(testId),
    ]);
    return {
      cached:
        meta.cached && paper.cached
          ? { meta: meta.cached, questions: paper.cached }
          : undefined,
      fresh: Promise.all([meta.fresh, paper.fresh]).then(([freshMeta, freshPaper]) => ({
        meta: freshMeta,
        questions: freshPaper,
      })),
    };
  }
}

/** Returns cache immediately when possible while allowing the refresh to update SQLite. */
export async function resolveCachedRead<T>(read: Promise<CachedRead<T>>): Promise<T> {
  const result = await read;
  if (result.cached !== undefined) {
    void result.fresh.catch(() => undefined);
    return result.cached;
  }
  return result.fresh;
}

let publicReadCachePromise: Promise<PublicReadCache> | undefined;

export function getPublicReadCache(): Promise<PublicReadCache> {
  if (!publicReadCachePromise) {
    publicReadCachePromise = getOfflineDatabase()
      .then((database) => new PublicReadCache(getApi(), createOfflineRepositories(database)))
      // A cache initialization problem must not break the already-working online client.
      .catch(() => new PublicReadCache(getApi()));
  }
  return publicReadCachePromise;
}

export function resetPublicReadCacheForTests(): void {
  publicReadCachePromise = undefined;
}

export type { ApiPaperQuestion, ApiTestMeta };
