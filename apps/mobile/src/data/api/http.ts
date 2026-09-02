import {
  AttemptSchema,
  OkSchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  ResultSchema,
  SubmitResponseSchema,
  TestSchema,
  TestSummarySchema,
  type AnswerPatch,
  type Attempt,
  type AttemptCreate,
  type Ok,
  type OtpRequest,
  type OtpRequestResponse,
  type OtpVerify,
  type OtpVerifyResponse,
  type Result,
  type SubmitResponse,
  type Test,
  type TestSummary,
} from '@tslprb/api-contracts';
import { patternFor, type Question as PaperQuestion, type TestMeta } from '@tslprb/fixtures';
import { z } from 'zod';

import { MockApi } from './mock';
import { ApiError, type AppApi, type ResultDetail } from './types';

const HealthSchema = z.object({ status: z.string() });
const TestSummaryListSchema = z.array(TestSummarySchema);

/**
 * Thin fetch client against services/api. Responses are validated with the shared zod
 * schemas so a drifting backend fails loudly here rather than deep inside a screen.
 *
 * The three AppApi extras (exam pattern, answer key, rich analysis) have no /v1 endpoint
 * yet, so they fall back to fixtures; replace each as services/api grows the endpoint.
 */
export class HttpApi implements AppApi {
  private readonly baseUrl: string;
  private readonly fallback = new MockApi();
  private token?: string;

  constructor(baseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  setToken(token: string | undefined) {
    this.token = token;
  }

  private async request<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: { method?: string; body?: unknown },
  ): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (init?.body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

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

  requestOtp(body: OtpRequest): Promise<OtpRequestResponse> {
    return this.request('/v1/otp/request', OtpRequestResponseSchema, { method: 'POST', body });
  }

  verifyOtp(body: OtpVerify): Promise<OtpVerifyResponse> {
    return this.request('/v1/otp/verify', OtpVerifyResponseSchema, { method: 'POST', body });
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

  patchAttemptAnswer(attemptId: string, body: AnswerPatch): Promise<Ok> {
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

  // --- AppApi extras: not served by /v1 yet ---------------------------------

  async listTestMetas(): Promise<TestMeta[]> {
    const list = await this.listTests();
    return list.map((t) => ({
      id: t.id,
      kind: 'full',
      title: { en: t.title, te: t.title, ur: t.title },
      pattern: patternFor(t.post),
      free: false,
    }));
  }

  async getTestMeta(id: string): Promise<TestMeta> {
    const metas = await this.listTestMetas();
    const meta = metas.find((m) => m.id === id);
    if (!meta) throw new ApiError(404, 'test_not_found', `No test with id ${id}`);
    return meta;
  }

  getPaper(testId: string): Promise<PaperQuestion[]> {
    return this.fallback.getPaper(testId);
  }

  getResultDetail(id: string): Promise<ResultDetail> {
    return this.fallback.getResultDetail(id);
  }
}
