import {
  AppContentSchema,
  TestMetaSchema,
  PaperQuestionSchema,
  ReviewPaperQuestionSchema,
  ResultDetailSchema,
  type SubmitInput,
  AttemptSchema,
  OkSchema,
  PhoneSignInResponseSchema,
  ResultSchema,
  SubmitResponseSchema,
  TestSchema,
  TestSummarySchema,
  type AnswerPatchInput,
  type Attempt,
  type AttemptCreate,
  type Ok,
  type PhoneSignIn,
  type PhoneSignInResponse,
  type Result,
  type SubmitResponse,
  type Test,
  type TestSummary,
} from '@tslprb/api-contracts';
import type { Question, TestMeta } from '@tslprb/fixtures/src/runtime';
import { z } from 'zod';

import { useApiCache } from '../apiCache';
import { ApiError, type AppApi, type ResultDetail, type PaperQuestion } from './types';

const HealthSchema = z.object({ status: z.string() });
const TestSummaryListSchema = z.array(TestSummarySchema);

export type HttpApiOptions = {
  baseUrl?: string;
  /** Read at request time so a sign-in mid-session is picked up without rebuilding the client. */
  getToken?: () => string | undefined;
};

/** Validated server API. Offline reads use only previously downloaded responses. */
export class HttpApi implements AppApi {
  private readonly baseUrl: string;
  private readonly getToken: () => string | undefined;

  constructor(options: HttpApiOptions = {}) {
    const base =
      options.baseUrl ??
      process.env.EXPO_PUBLIC_API_URL ??
      'https://mocktest.brollyexamprep.com/api';
    this.baseUrl = base.replace(/\/+$/, '');
    this.getToken = options.getToken ?? (() => undefined);
  }

  private async read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const key = `${this.baseUrl}:${path}`;
    const epoch = useApiCache.getState().epoch;
    try {
      const data = await this.request(path, schema);
      if (useApiCache.getState().epoch === epoch) useApiCache.getState().put(key, data);
      return data;
    } catch (error) {
      // Never hide a missing/closed resource, invalid response, or permission error.
      if (!(error instanceof ApiError) || (error.status !== 0 && error.status < 500)) throw error;
      const cached = useApiCache.getState().entries[key];
      if (cached) {
        try {
          return schema.parse(cached);
        } catch {
          /* discard corrupt cache */
        }
      }
      throw error;
    }
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        signal: controller.signal,
        method: init?.method ?? 'GET',
        headers,
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (cause) {
      throw new ApiError(0, 'network_error', cause instanceof Error ? cause.message : 'Offline');
    } finally {
      clearTimeout(timeout);
    }
    if (!res.ok) {
      throw new ApiError(res.status, 'http_error', `${init?.method ?? 'GET'} ${path} failed`);
    }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) throw new ApiError(res.status, 'schema_mismatch', parsed.error.message);
    return parsed.data;
  }

  health(): Promise<{ status: string }> {
    return this.request('/health', HealthSchema);
  }

  signInWithPhone(body: PhoneSignIn): Promise<PhoneSignInResponse> {
    return this.request('/v1/auth/phone', PhoneSignInResponseSchema, { method: 'POST', body });
  }

  listTests(): Promise<TestSummary[]> {
    return this.request('/v1/tests', TestSummaryListSchema);
  }

  getTest(id: string): Promise<Test> {
    return this.request(`/v1/tests/${encodeURIComponent(id)}`, TestSchema);
  }

  createAttempt(body: AttemptCreate): Promise<Attempt> {
    return this.request('/v1/attempts', AttemptSchema, { method: 'POST', body });
  }

  patchAttemptAnswer(attemptId: string, body: AnswerPatchInput): Promise<Ok> {
    return this.request(`/v1/attempts/${encodeURIComponent(attemptId)}/answers`, OkSchema, {
      method: 'PATCH',
      body,
    });
  }

  submitAttempt(attemptId: string, body?: SubmitInput): Promise<SubmitResponse> {
    return this.request(
      `/v1/attempts/${encodeURIComponent(attemptId)}/submit`,
      SubmitResponseSchema,
      { method: 'POST', body },
    );
  }

  getResult(id: string): Promise<Result> {
    return this.request(`/v1/results/${encodeURIComponent(id)}`, ResultSchema);
  }

  getContent() {
    return this.read('/v1/content', AppContentSchema);
  }

  getAttemptMeta(id: string): Promise<TestMeta> {
    return this.read(`/v1/attempts/${encodeURIComponent(id)}/meta`, TestMetaSchema);
  }

  listTestMetas(): Promise<TestMeta[]> {
    return this.read('/v1/tests/catalog', z.array(TestMetaSchema));
  }

  getTestMeta(id: string): Promise<TestMeta> {
    return this.read(`/v1/tests/${encodeURIComponent(id)}/meta`, TestMetaSchema);
  }

  getPaper(testId: string): Promise<PaperQuestion[]> {
    return this.read(`/v1/tests/${encodeURIComponent(testId)}/paper`, z.array(PaperQuestionSchema));
  }

  getAttemptPaper(attemptId: string): Promise<PaperQuestion[]> {
    return this.read(
      `/v1/attempts/${encodeURIComponent(attemptId)}/paper`,
      z.array(PaperQuestionSchema),
    );
  }

  getReviewPaper(resultId: string): Promise<Question[]> {
    return this.read(
      `/v1/results/${encodeURIComponent(resultId)}/paper`,
      z.array(ReviewPaperQuestionSchema),
    );
  }

  getResultDetail(resultId: string): Promise<ResultDetail> {
    return this.read(`/v1/results/${encodeURIComponent(resultId)}/detail`, ResultDetailSchema);
  }
}
