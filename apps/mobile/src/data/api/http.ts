import {
  AttemptDetailSchema,
  AttemptSchema,
  ContentSchema,
  OkSchema,
  PaperQuestionSchema,
  PhoneSignInResponseSchema,
  ResultDetailSchema,
  ResultSchema,
  ReviewQuestionSchema,
  SubmitResponseSchema,
  TestMetaSchema,
  TestSchema,
  TestSummarySchema,
  type AnswerPatchInput,
  type Attempt,
  type AttemptCreate,
  type AttemptDetail,
  type Content,
  type Ok,
  type PaperQuestion as ApiPaperQuestion,
  type PhoneSignIn,
  type PhoneSignInResponse,
  type Result,
  type ResultDetail as ApiResultDetail,
  type ReviewQuestion,
  type SubmitResponse,
  type Test,
  type TestMeta as ApiTestMeta,
  type TestSummary,
} from '@tslprb/api-contracts';
import type { TestMeta } from '@tslprb/fixtures';
import { z } from 'zod';

import { mapPaperQuestion, mapResultDetail, mapReviewQuestion, mapTestMeta } from './mappers';
import {
  ApiError,
  type AppApi,
  type PaperQuestion,
  type ResultDetail,
  type ReviewPaperQuestion,
} from './types';

const HealthSchema = z.object({ status: z.string() });
const TestSummaryListSchema = z.array(TestSummarySchema);
const TestMetaListSchema = z.array(TestMetaSchema);
const PaperQuestionListSchema = z.array(PaperQuestionSchema);
const ReviewQuestionListSchema = z.array(ReviewQuestionSchema);

const DEFAULT_API_URL = 'https://mocktest.brollyexamprep.com/api';

export type HttpApiOptions = {
  baseUrl?: string;
  getToken?: () => string | undefined;
};

/** Strict fetch client for the complete FastAPI v0.2 surface. */
export class HttpApi implements AppApi {
  private readonly baseUrl: string;
  private readonly getToken: () => string | undefined;

  constructor(options: HttpApiOptions = {}) {
    const base = options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
    this.baseUrl = base.replace(/\/+$/, '');
    this.getToken = options.getToken ?? (() => undefined);
  }

  private async request<Schema extends z.ZodTypeAny>(
    path: string,
    schema: Schema,
    init?: { method?: string; body?: unknown },
  ): Promise<z.output<Schema>> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = this.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method: init?.method ?? 'GET',
        headers,
        body: init?.body === undefined ? undefined : JSON.stringify(init.body),
      });
    } catch (cause) {
      throw new ApiError(0, 'network_error', cause instanceof Error ? cause.message : 'Offline');
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

  submitAttempt(attemptId: string): Promise<SubmitResponse> {
    return this.request(
      `/v1/attempts/${encodeURIComponent(attemptId)}/submit`,
      SubmitResponseSchema,
      { method: 'POST' },
    );
  }

  getResult(id: string): Promise<Result> {
    return this.request(`/v1/results/${encodeURIComponent(id)}`, ResultSchema);
  }

  getContent(): Promise<Content> {
    return this.request('/v1/content', ContentSchema);
  }

  listTestCatalog(): Promise<ApiTestMeta[]> {
    return this.request('/v1/tests/catalog', TestMetaListSchema);
  }

  getTestMetaResponse(id: string): Promise<ApiTestMeta> {
    return this.request(`/v1/tests/${encodeURIComponent(id)}/meta`, TestMetaSchema);
  }

  getTestPaper(id: string): Promise<ApiPaperQuestion[]> {
    return this.request(`/v1/tests/${encodeURIComponent(id)}/paper`, PaperQuestionListSchema);
  }

  getAttempt(id: string): Promise<AttemptDetail> {
    return this.request(`/v1/attempts/${encodeURIComponent(id)}`, AttemptDetailSchema);
  }

  getAttemptPaper(id: string): Promise<ApiPaperQuestion[]> {
    return this.request(
      `/v1/attempts/${encodeURIComponent(id)}/paper`,
      PaperQuestionListSchema,
    );
  }

  getAttemptMeta(id: string): Promise<ApiTestMeta> {
    return this.request(`/v1/attempts/${encodeURIComponent(id)}/meta`, TestMetaSchema);
  }

  getResultDetailResponse(id: string): Promise<ApiResultDetail> {
    return this.request(`/v1/results/${encodeURIComponent(id)}/detail`, ResultDetailSchema);
  }

  getResultPaper(id: string): Promise<ReviewQuestion[]> {
    return this.request(`/v1/results/${encodeURIComponent(id)}/paper`, ReviewQuestionListSchema);
  }

  async listTestMetas(): Promise<TestMeta[]> {
    return (await this.listTestCatalog()).map(mapTestMeta);
  }

  async getTestMeta(id: string): Promise<TestMeta> {
    return mapTestMeta(await this.getTestMetaResponse(id));
  }

  async getPaper(testId: string): Promise<PaperQuestion[]> {
    return (await this.getTestPaper(testId)).map(mapPaperQuestion);
  }

  async getAttemptMetaData(attemptId: string): Promise<TestMeta> {
    return mapTestMeta(await this.getAttemptMeta(attemptId));
  }

  async getAttemptPaperData(attemptId: string): Promise<PaperQuestion[]> {
    return (await this.getAttemptPaper(attemptId)).map(mapPaperQuestion);
  }

  async getResultDetail(id: string): Promise<ResultDetail> {
    return mapResultDetail(await this.getResultDetailResponse(id));
  }

  async getReviewPaper(resultId: string): Promise<ReviewPaperQuestion[]> {
    return (await this.getResultPaper(resultId)).map(mapReviewQuestion);
  }
}
