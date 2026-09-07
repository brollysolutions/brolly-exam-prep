import {
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
 * The AppApi extras have no /v1 endpoint yet. `/v1/tests` carries no exam pattern, no
 * section locks and no answer key, so `listTestMetas`, `getTestMeta` and `getPaper` are
 * NOT derived from it (an earlier version invented Telugu titles by copying the English
 * one and guessed a pattern from the post, which would have shipped silently wrong
 * section locks). They are served from the fixture bank the app ships — the same one
 * `MockApi` uses — exactly like `getResultDetail`, so the catalogue, the paper and the
 * analysis still render against a real backend (F-27 runs the web build with
 * `EXPO_PUBLIC_API=http`). The attempt lifecycle (`createAttempt`, `patchAttemptAnswer`,
 * `submitAttempt`, `getResult`) and the OTP calls do go over the wire. Replace the three
 * fixture reads when `GET /v1/tests/{id}/paper` lands. Until then the ids these reads hand
 * out (`mock-07`, `q-ar-001#n`) are not the API's (`test-pwt-07`, `q-arith-*`), so
 * `POST /v1/attempts` 404s and the attempt route falls back to its offline start.
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

  // --- AppApi extras: not served by /v1 yet (fixture bank, see the class comment) -----

  listTestMetas(): Promise<TestMeta[]> {
    return this.fallback.listTestMetas();
  }

  getTestMeta(id: string): Promise<TestMeta> {
    return this.fallback.getTestMeta(id);
  }

  getPaper(testId: string): Promise<PaperQuestion[]> {
    return this.fallback.getPaper(testId);
  }

  /** Fixture analysis: the endpoint does not exist, but the result screen must still render. */
  getResultDetail(id: string): Promise<ResultDetail> {
    return this.fallback.getResultDetail(id);
  }
}
