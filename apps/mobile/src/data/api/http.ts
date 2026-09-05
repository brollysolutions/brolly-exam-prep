import {
  AttemptSchema,
  OkSchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  ResultSchema,
  SubmitResponseSchema,
  TestSchema,
  TestSummarySchema,
  type AnswerPatchInput,
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
import type { Question as PaperQuestion, TestMeta } from '@tslprb/fixtures';
import { z } from 'zod';

import { MockApi } from './mock';
import { ApiError, type AppApi, type ResultDetail } from './types';

const HealthSchema = z.object({ status: z.string() });
const TestSummaryListSchema = z.array(TestSummarySchema);

export type HttpApiOptions = {
  baseUrl?: string;
  /** Read at request time so a sign-in mid-session is picked up without rebuilding the client. */
  getToken?: () => string | undefined;
};

/**
 * Thin fetch client against services/api. Responses are validated with the shared zod
 * schemas so a drifting backend fails loudly here rather than deep inside a screen.
 *
 * The AppApi extras have no /v1 endpoint yet. `listTestMetas`, `getTestMeta` and
 * `getPaper` reject with 501 rather than fabricate data (the earlier version invented
 * Telugu titles by copying the English one and guessed a pattern from the post,
 * which would have shipped silently wrong section locks). `getResultDetail` is the one
 * exception: it serves the fixture analysis so the result screen still renders against a
 * real backend, and says so.
 *
 * Category spelling: the app and @tslprb/fixtures use lower-case ids ("oc", "exs"); the
 * wire uses "OC" / "ExS". No /v1 request or response carries a category yet, so there is
 * nothing to convert today — when one appears, call `toApiCategory` / `fromApiCategory`
 * from @tslprb/api-contracts *here*, in this class, and nowhere else. Neither spelling
 * belongs in a store or a screen.
 */
export class HttpApi implements AppApi {
  private readonly baseUrl: string;
  private readonly getToken: () => string | undefined;
  private fallbackApi?: MockApi;

  constructor(options: HttpApiOptions = {}) {
    const base = options.baseUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';
    this.baseUrl = base.replace(/\/+$/, '');
    this.getToken = options.getToken ?? (() => undefined);
  }

  /** Built on first use only, so an http-only app never pays for the fixture bundle. */
  private get fallback(): MockApi {
    this.fallbackApi ??= new MockApi();
    return this.fallbackApi;
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

  // --- AppApi extras: not served by /v1 yet ---------------------------------

  /** Rejects (never throws synchronously) so every AppApi method fails the same way. */
  private notYet(what: string): Promise<never> {
    return Promise.reject(
      new ApiError(501, 'not_implemented', `${what} is not available over http yet`),
    );
  }

  listTestMetas(): Promise<TestMeta[]> {
    return this.notYet('listTestMetas');
  }

  getTestMeta(): Promise<TestMeta> {
    return this.notYet('getTestMeta');
  }

  getPaper(): Promise<PaperQuestion[]> {
    return this.notYet('getPaper');
  }

  /** Fixture analysis: the endpoint does not exist, but the result screen must still render. */
  getResultDetail(id: string): Promise<ResultDetail> {
    return this.fallback.getResultDetail(id);
  }
}
