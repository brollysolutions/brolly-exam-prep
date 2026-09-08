import type { AnswerPatchInput, ApiClient } from '@tslprb/api-contracts';
import type { Question as PaperQuestion, TestMeta } from '@tslprb/fixtures';

export type { PaperQuestion };

/** The two-language string every fixture carries. */
export type LocalizedCopy = { en: string; te: string };

/** One "do these three next" drill card on the result screen. */
export type ResultAction = {
  id: string;
  title: LocalizedCopy;
  sub: LocalizedCopy;
};

/**
 * One row of the per-question review table: what the candidate did, not what was right.
 * `your` is null when the question was skipped. The answer key is deliberately absent -
 * it lives on the paper question this row's `questionNo` points at, so the two can never
 * disagree.
 */
export type ResultReviewRow = {
  /** 1-based question number in the paper. */
  questionNo: number;
  your: number | null;
  seconds: number;
};

/**
 * The rich, prototype-shaped result the analysis screen renders. `ResultSchema` in
 * @tslprb/api-contracts mirrors the FastAPI endpoint and deliberately carries less
 * (no rank pool, no average time, no drill suggestions), so the app asks for this
 * alongside it rather than widening the shared contract for a screen the API does not
 * serve yet.
 *
 * Written out by hand — deriving it as `typeof SAMPLE_RESULT` would bake that fixture's
 * `as const` literal types (`score: 62.25`, `qualified: true`, `rank: 1284`, readonly
 * arrays) into every consumer, so no screen could render a different result.
 */
export type ResultDetail = {
  id: string;
  /** The "Full Mock 07" number, for the `result.title` interpolation. */
  testTitleN: number;
  /** The paper's own title, when the caller knows it — a previous-year paper is not a mock. */
  title?: LocalizedCopy;
  score: number;
  maxScore: number;
  cutoffPct: number;
  qualified: boolean;
  /**
   * Where this candidate came in the pool, and how big the pool was.
   *
   * BOTH OPTIONAL, and usually absent: a rank is a fact about every other candidate, so a
   * handset marking its own paper cannot know one, and the API returns `rank: null` for a
   * fresh result too. They are rendered only when they are present — carrying the sample
   * fixture's "1,284 / 9,033" into a real candidate's result is what F-34 removed.
   */
  rank?: number;
  totalCandidates?: number;
  accuracyPct: number;
  avgSecondsPerQuestion: number;
  /** Negative, or 0 when the pattern carries no negative marking. */
  negativeMarks: number;
  correct: number;
  wrong: number;
  skipped: number;
  /**
   * "Do these three next". Empty when nothing is known to suggest: the drills are a fact
   * about the catalogue, not about the marking, and a locally marked paper has no view of
   * one. The screen renders the block only when there is something in it.
   */
  actions: ResultAction[];
  review: ResultReviewRow[];
};

/**
 * `ApiClient` (one method per /v1 endpoint) plus the app-only reads the contract cannot
 * express: the exam pattern that drives section locking, the answer key the solutions
 * screen needs, and the analysis payload above.
 */
export interface AppApi extends Omit<ApiClient, 'signInWithPhone'> {
  listTestMetas(): Promise<TestMeta[]>;
  getTestMeta(id: string): Promise<TestMeta>;
  getPaper(testId: string): Promise<PaperQuestion[]>;
  getResultDetail(id: string): Promise<ResultDetail>;
}

export type { AnswerPatchInput };

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
