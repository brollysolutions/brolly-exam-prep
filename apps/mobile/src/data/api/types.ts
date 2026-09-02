import type { ApiClient } from '@tslprb/api-contracts';
import type { Question as PaperQuestion, SAMPLE_RESULT, TestMeta } from '@tslprb/fixtures';

export type { PaperQuestion };

/**
 * The rich, prototype-shaped result the analysis screen renders (rank, accuracy, negative
 * marks, drill suggestions, per-question review). `ResultSchema` in @tslprb/api-contracts
 * mirrors the FastAPI endpoint and deliberately carries less; rather than widen the shared
 * contract for a screen the API does not serve yet, the app asks for this alongside it.
 */
export type ResultDetail = typeof SAMPLE_RESULT;

/**
 * `ApiClient` (one method per /v1 endpoint) plus the app-only reads the contract cannot
 * express: the exam pattern that drives section locking, the answer key the solutions
 * screen needs, and the analysis payload above.
 */
export interface AppApi extends ApiClient {
  listTestMetas(): Promise<TestMeta[]>;
  getTestMeta(id: string): Promise<TestMeta>;
  getPaper(testId: string): Promise<PaperQuestion[]>;
  getResultDetail(id: string): Promise<ResultDetail>;
}

/** Every adapter rejects with this, so screens can branch on `status` without sniffing text. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message?: string) {
    super(message ?? `${code} (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}
