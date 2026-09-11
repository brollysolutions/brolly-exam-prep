import {
  ResultDetailSchema,
  ResultSchema,
  ReviewQuestionSchema,
  type ApiV2Client,
  type ResultDetail as ApiResultDetail,
  type ReviewQuestion,
} from '@tslprb/api-contracts';
import { z } from 'zod';

import { getApi } from '../api';
import { mapResultDetail, mapReviewQuestion } from '../api/mappers';
import type { ResultDetail, ReviewPaperQuestion } from '../api/types';
import { getOfflineDatabase } from './database';
import { createOfflineRepositories, type UserScope } from './repositories';
import type { CachedRead } from './readCache';

const ResultPaperSchema = z.array(ReviewQuestionSchema);

type ResultReadApi = Pick<
  ApiV2Client,
  'getResult' | 'getResultDetailResponse' | 'getResultPaper'
>;
type OfflineRepositories = ReturnType<typeof createOfflineRepositories>;
export type ResultReadOptions = { refresh?: boolean };

function assertRequestedId(actual: string, expected: string, context: string): void {
  if (actual !== expected) throw new Error(`${context} id does not match the request`);
}

function uniqueQuestionIds(paper: ReviewQuestion[]): ReviewQuestion[] {
  const ids = new Set<string>();
  for (const question of paper) {
    if (ids.has(question.id)) throw new Error(`Result paper contains duplicate id ${question.id}`);
    ids.add(question.id);
  }
  return paper;
}

/**
 * Authorized, user-scoped result reads. Raw validated wire payloads are kept in SQLite and
 * mapped at this boundary, just like the public Phase 2 cache. Result review is deliberately
 * separate from `cached_papers`, preserving the pre-submission answer-key boundary.
 */
export class ResultReadCache {
  private readonly paperRefreshes = new Map<string, Promise<ReviewPaperQuestion[]>>();

  constructor(
    private readonly api: ResultReadApi,
    private readonly repositories?: OfflineRepositories,
    private readonly now: () => number = Date.now,
  ) {}

  async readDetail(
    scope: UserScope,
    resultId: string,
    options: ResultReadOptions = {},
  ): Promise<CachedRead<ResultDetail>> {
    let cached: ResultDetail | undefined;
    if (this.repositories) {
      try {
        const entry = await this.repositories.results.getDetail<unknown>(scope, resultId);
        if (entry) {
          const raw = ResultDetailSchema.parse(entry.payload);
          assertRequestedId(raw.id, resultId, 'Cached result');
          cached = mapResultDetail(raw);
        }
      } catch {
        // Detail is the mandatory parent of a cached review, so reject the whole malformed row.
        await this.repositories.results.delete(scope, resultId).catch(() => undefined);
      }
    }

    return {
      cached,
      fresh:
        options.refresh === false
          ? this.offlineValue(cached, 'Result is not cached')
          : this.refreshDetail(scope, resultId, true),
    };
  }

  async readPaper(
    scope: UserScope,
    resultId: string,
    options: ResultReadOptions = {},
  ): Promise<CachedRead<ReviewPaperQuestion[]>> {
    let cached: ReviewPaperQuestion[] | undefined;
    if (this.repositories) {
      try {
        const entry = await this.repositories.results.getPaper<unknown>(scope, resultId);
        if (entry) {
          const raw = uniqueQuestionIds(ResultPaperSchema.parse(entry.payload));
          cached = raw.map(mapReviewQuestion);
        }
      } catch {
        // A corrupt review must not discard an otherwise valid result summary.
        await this.repositories.results.deletePaper(scope, resultId).catch(() => undefined);
      }
    }

    return {
      cached,
      fresh:
        options.refresh === false
          ? this.offlineValue(cached, 'Result review is not cached')
          : this.refreshPaper(scope, resultId),
    };
  }

  private offlineValue<T>(cached: T | undefined, message: string): Promise<T> {
    return cached === undefined
      ? Promise.resolve().then(() => {
          throw new Error(message);
        })
      : Promise.resolve(cached);
  }

  private async refreshDetail(
    scope: UserScope,
    resultId: string,
    warmPaper: boolean,
  ): Promise<ResultDetail> {
    const raw: ApiResultDetail = ResultDetailSchema.parse(
      await this.api.getResultDetailResponse(resultId),
    );
    assertRequestedId(raw.id, resultId, 'Result');

    if (this.repositories) {
      const identity = await this.resolveIdentity(scope, resultId);
      await this.repositories.results
        .putDetail({
          ...scope,
          resultId,
          testId: identity.testId,
          attemptId: identity.attemptId,
          detail: raw,
          updatedAt: this.now(),
        })
        .catch(() => undefined);

      // Opening the summary opportunistically makes Solutions available offline too, without
      // delaying the already-renderable detail response.
      if (warmPaper) void this.refreshPaper(scope, resultId).catch(() => undefined);
    }

    return mapResultDetail(raw);
  }

  private refreshPaper(scope: UserScope, resultId: string): Promise<ReviewPaperQuestion[]> {
    const key = `${scope.userId}\u0000${resultId}`;
    const existing = this.paperRefreshes.get(key);
    if (existing) return existing;

    const refresh = (async () => {
      const raw = uniqueQuestionIds(ResultPaperSchema.parse(await this.api.getResultPaper(resultId)));
      if (this.repositories) {
        let identity = await this.repositories.results
          .getIdentity(scope, resultId)
          .catch(() => undefined);
        if (!identity) {
          // A directly opened Solutions route still needs a validated detail parent and stable
          // test/attempt identity before its authorized review can be cached.
          await this.refreshDetail(scope, resultId, false).catch(() => undefined);
          identity = await this.repositories.results
            .getIdentity(scope, resultId)
            .catch(() => undefined);
        }
        if (identity) {
          await this.repositories.results
            .putPaper(scope, resultId, raw, this.now())
            .catch(() => undefined);
        }
      }
      return raw.map(mapReviewQuestion);
    })();

    this.paperRefreshes.set(key, refresh);
    const release = () => {
      if (this.paperRefreshes.get(key) === refresh) this.paperRefreshes.delete(key);
    };
    void refresh.then(release, release);
    return refresh;
  }

  private async resolveIdentity(
    scope: UserScope,
    resultId: string,
  ): Promise<{ testId: string; attemptId?: string }> {
    if (!this.repositories) throw new Error('Result cache is unavailable');

    const localAttempt = await this.repositories.attempts.findByResultId(scope, resultId);
    if (localAttempt) return { testId: localAttempt.testId, attemptId: localAttempt.id };

    const cached = await this.repositories.results.getIdentity(scope, resultId);
    if (cached) return { testId: cached.testId, attemptId: cached.attemptId };

    // Older submitted attempts may predate Phase 5 local linkage. The existing result summary
    // endpoint supplies the missing stable identities; no field is inferred from route order.
    const summary = ResultSchema.parse(await this.api.getResult(resultId));
    assertRequestedId(summary.id, resultId, 'Result summary');
    return { testId: summary.test_id, attemptId: summary.attempt_id ?? undefined };
  }
}

let resultReadCachePromise: Promise<ResultReadCache> | undefined;

export function getResultReadCache(): Promise<ResultReadCache> {
  if (!resultReadCachePromise) {
    resultReadCachePromise = getOfflineDatabase()
      .then((database) => new ResultReadCache(getApi(), createOfflineRepositories(database)))
      // Preserve the working online result flow if local database initialization fails.
      .catch(() => new ResultReadCache(getApi()));
  }
  return resultReadCachePromise;
}

export function resetResultReadCacheForTests(): void {
  resultReadCachePromise = undefined;
}
