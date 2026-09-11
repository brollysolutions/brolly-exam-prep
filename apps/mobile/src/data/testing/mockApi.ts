import type {
  AnswerPatchInput,
  Attempt,
  AttemptDetail,
  AttemptCreate,
  Content,
  LocalizedText,
  Ok,
  PhoneSignIn,
  PhoneSignInResponse,
  Result,
  ResultDetail as ApiResultDetail,
  ReviewQuestion,
  SectionScore,
  SubmitResponse,
  Test,
  TestMeta as ApiTestMeta,
  PaperQuestion as ApiPaperQuestion,
  TestSummary,
  WrongAnswer,
} from '@tslprb/api-contracts';
import {
  isImportedTest,
  paperForTest,
  SAMPLE_RESULT,
  TESTS,
  type ExamPattern,
  type Question as FixtureQuestion,
  type TestMeta,
} from '@tslprb/fixtures';
import { en, te } from '@tslprb/i18n';

import { useCompletedTestsStore } from '../completedTests';
import { useAttemptStore } from '../attempt';
import { canReviewImportedTest } from '../importedAttempt';

import {
  ApiError,
  type AppApi,
  type PaperQuestion,
  type ResultDetail,
  type ReviewPaperQuestion,
} from '../api/types';
import { mapPaperQuestion, mapResultDetail, mapReviewQuestion, mapTestMeta } from '../api/mappers';

/** The dev OTP accepted for any phone (mirrors services/api's dev code, spec 10). */
export const DEV_OTP = '123456';

const MIN_LATENCY_MS = 150;
const MAX_LATENCY_MS = 400;

const isTest = process.env.NODE_ENV === 'test';

/** 150-400 ms of realistic latency in the app; instant under jest so tests stay deterministic. */
function latency(): Promise<void> {
  if (isTest) return Promise.resolve();
  const ms = MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${(seq += 1)}-${Date.now().toString(36)}`;

/** Resolves an i18n key (e.g. `test.sections.gs`) into the contract's LocalizedText. */
function localize(key: string): LocalizedText {
  const read = (bundle: unknown): string => {
    let node: unknown = bundle;
    for (const part of key.split('.')) {
      if (typeof node !== 'object' || node === null) return key;
      node = (node as Record<string, unknown>)[part];
    }
    return typeof node === 'string' ? node : key;
  };
  return { en: read(en), te: read(te) };
}

const marksOf = (p: ExamPattern) => p.totalQuestions * p.marksPerCorrect;

function toSummary(meta: TestMeta): TestSummary {
  return {
    id: meta.id,
    slug: meta.id,
    title: meta.title.en,
    post: meta.pattern.post,
    duration_minutes: meta.pattern.durationMinutes,
    total_marks: marksOf(meta.pattern),
    section_count: meta.pattern.sections.length,
    question_count: meta.pattern.totalQuestions,
  };
}

function findMeta(id: string): TestMeta {
  const meta = TESTS.find((t) => t.id === id);
  if (!meta) throw new ApiError(404, 'test_not_found', `No test with id ${id}`);
  return meta;
}

const paperOf = (meta: TestMeta): FixtureQuestion[] => paperForTest(meta);

function toApiMeta(meta: TestMeta): ApiTestMeta {
  return {
    id: meta.id,
    kind: meta.kind,
    title: meta.title,
    pattern: {
      id: meta.pattern.id,
      post: meta.pattern.post,
      total_questions: meta.pattern.totalQuestions,
      duration_minutes: meta.pattern.durationMinutes,
      marks_per_correct: meta.pattern.marksPerCorrect,
      negative_per_wrong: meta.pattern.negativePerWrong,
      qualifying_only: meta.pattern.qualifyingOnly,
      sections: meta.pattern.sections.map((section) => ({
        id: section.id,
        label_key: section.labelKey,
        questions: section.questions,
        unlock_after: section.unlockAfter ?? null,
      })),
      verified: meta.pattern.verified,
      source: meta.pattern.source,
    },
    full_mocks_only: meta.fullMocksOnly ?? false,
    listed: meta.listed ?? true,
    free: meta.free,
    attempted: meta.attempted
      ? { best_score: meta.attempted.bestScore, attempts: meta.attempted.attempts }
      : null,
  };
}

function toApiPaper(question: FixtureQuestion): ApiPaperQuestion {
  return {
    id: question.id,
    section: question.section,
    text: question.text,
    options: { en: [...question.options.en], te: [...question.options.te] },
    avg_seconds: question.avgSeconds,
  };
}

/**
 * SAMPLE_RESULT widened onto ResultDetail. The return annotation is the compile-time check
 * that the fixture still satisfies the shape screens are written against, and building a
 * fresh object per call means a caller that sorts or filters `review` in place cannot
 * corrupt the next caller's copy (the fixture itself is `as const`, so it must be copied
 * anyway).
 */
const sampleDetail = (): ResultDetail => ({
  ...SAMPLE_RESULT,
  actions: SAMPLE_RESULT.actions.map((a) => ({
    id: a.id,
    title: { ...a.title },
    sub: { ...a.sub },
  })),
  review: SAMPLE_RESULT.review.map((r) => ({ ...r })),
});

function toApiResultDetail(detail: ResultDetail): ApiResultDetail {
  return {
    id: detail.id,
    test_title_n: detail.testTitleN,
    title: detail.title ?? null,
    score: detail.score,
    max_score: detail.maxScore,
    cutoff_pct: detail.cutoffPct,
    qualified: detail.qualified,
    rank: detail.rank ?? null,
    total_candidates: detail.totalCandidates ?? null,
    accuracy_pct: detail.accuracyPct,
    avg_seconds_per_question: detail.avgSecondsPerQuestion,
    negative_marks: detail.negativeMarks,
    correct: detail.correct,
    wrong: detail.wrong,
    skipped: detail.skipped,
    actions: detail.actions,
    review: detail.review.map((row) => ({
      question_no: row.questionNo,
      your: row.your,
      seconds: row.seconds,
    })),
  };
}

/**
 * Largest-remainder apportionment: splits `total` across `weights` so the parts are as
 * proportional as integers allow and sum to exactly `total` (no rounding drift, which is
 * what made the per-section splits disagree with the headline score).
 */
export function apportion(total: number, weights: number[]): number[] {
  const weightSum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || weightSum <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / weightSum);
  const shares = exact.map((v) => Math.floor(v));
  let left = total - shares.reduce((a, b) => a + b, 0);
  const byRemainder = exact
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byRemainder) {
    if (left <= 0) break;
    shares[i] += 1;
    left -= 1;
  }
  return shares;
}

function toTest(meta: TestMeta): Test {
  const paper = paperOf(meta);
  let offset = 0;
  const sections = meta.pattern.sections.map((spec, i) => {
    const slice = paper.slice(offset, offset + spec.questions);
    offset += spec.questions;
    return {
      id: spec.id,
      name: localize(spec.labelKey),
      order_index: i,
      questions: slice.map((q, j) => ({
        id: q.id,
        section_id: spec.id,
        order_index: j,
        text: q.text,
        options: { en: [...q.options.en], te: [...q.options.te] },
      })),
    };
  });
  return { ...toSummary(meta), sections };
}

type MockAttempt = { attempt: Attempt; testId: string; answers: Map<string, AnswerPatchInput> };

/**
 * In-memory ApiClient backed by @tslprb/fixtures. Attempts and results live for the life of
 * the process only - the persisted attempt store (src/data/attempt.ts) is what survives a
 * cold start, exactly as it will once the FastAPI service is real.
 */
export class MockApi implements AppApi {
  private readonly attempts = new Map<string, MockAttempt>();
  private readonly results = new Map<string, { testId: string; attemptId: string }>();

  async health(): Promise<{ status: string }> {
    await latency();
    return { status: 'ok' };
  }

  async getContent(): Promise<Content> {
    await latency();
    return {
      version: 'mock',
      notices: [],
      affairs: [],
      study_sections: [],
      exam_info: { pwt_date: '', label: { en: '', te: '' } },
      categories: [],
      cost_rows: { en: [], te: [] },
      physical_standards: [],
      standards_notification_year: 0,
    };
  }

  /**
   * The number is the whole credential (the OTP step went on 2026-09-07), so there is nothing
   * to check: a number that has been seen before comes back to the same user id, and one that
   * has not creates it. Same shape as the server's `POST /v1/auth/phone`.
   */
  async signInWithPhone(body: PhoneSignIn): Promise<PhoneSignInResponse> {
    await latency();
    return { token: nextId('tok'), user: { id: `usr-${body.phone}`, phone: body.phone } };
  }

  async listTests(): Promise<TestSummary[]> {
    await latency();
    return TESTS.map(toSummary);
  }

  async getTest(id: string): Promise<Test> {
    await latency();
    return toTest(findMeta(id));
  }

  async listTestCatalog(): Promise<ApiTestMeta[]> {
    await latency();
    return TESTS.map(toApiMeta);
  }

  async getTestMetaResponse(id: string): Promise<ApiTestMeta> {
    await latency();
    return toApiMeta(findMeta(id));
  }

  async getTestPaper(id: string): Promise<ApiPaperQuestion[]> {
    await latency();
    return paperOf(findMeta(id)).map(toApiPaper);
  }

  async listTestMetas(): Promise<TestMeta[]> {
    return (await this.listTestCatalog()).map(mapTestMeta);
  }

  async getTestMeta(id: string): Promise<TestMeta> {
    return mapTestMeta(await this.getTestMetaResponse(id));
  }

  async getPaper(testId: string): Promise<PaperQuestion[]> {
    if (isImportedTest(testId)) {
      await latency();
      return paperOf(findMeta(testId));
    }
    return (await this.getTestPaper(testId)).map(mapPaperQuestion);
  }

  async createAttempt(body: AttemptCreate): Promise<Attempt> {
    await latency();
    const meta = findMeta(body.test_id);
    const startedAt = Date.now();
    const attempt: Attempt = {
      id: nextId('att'),
      test_id: meta.id,
      started_at: new Date(startedAt).toISOString(),
      ends_at: new Date(startedAt + meta.pattern.durationMinutes * 60_000).toISOString(),
      status: 'in_progress',
    };
    this.attempts.set(attempt.id, { attempt, testId: meta.id, answers: new Map() });
    return attempt;
  }

  async patchAttemptAnswer(attemptId: string, body: AnswerPatchInput): Promise<Ok> {
    await latency();
    const row = this.attempts.get(attemptId);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${attemptId}`);
    row.answers.set(body.question_id, body);
    return { ok: true };
  }

  async getAttempt(id: string): Promise<AttemptDetail> {
    await latency();
    const row = this.attempts.get(id);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${id}`);
    return {
      ...row.attempt,
      answers: [...row.answers.values()].map((answer) => ({
        question_id: answer.question_id,
        choice: answer.choice ?? null,
        marked: answer.marked ?? false,
      })),
    };
  }

  async getAttemptPaper(id: string): Promise<ApiPaperQuestion[]> {
    const row = this.attempts.get(id);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${id}`);
    return this.getTestPaper(row.testId);
  }

  async getAttemptMeta(id: string): Promise<ApiTestMeta> {
    const row = this.attempts.get(id);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${id}`);
    return this.getTestMetaResponse(row.testId);
  }

  async getAttemptPaperData(id: string): Promise<PaperQuestion[]> {
    return (await this.getAttemptPaper(id)).map(mapPaperQuestion);
  }

  async getAttemptMetaData(id: string): Promise<TestMeta> {
    return mapTestMeta(await this.getAttemptMeta(id));
  }

  async submitAttempt(attemptId: string): Promise<SubmitResponse> {
    await latency();
    const row = this.attempts.get(attemptId);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${attemptId}`);
    row.attempt = { ...row.attempt, status: 'submitted' };
    const result_id = nextId('res');
    this.results.set(result_id, { testId: row.testId, attemptId });
    return { result_id };
  }

  async getResult(id: string): Promise<Result> {
    await latency();
    const row = this.results.get(id);
    if (!row) throw new ApiError(404, 'result_not_found', `No result ${id}`);
    return this.buildResult(id, row.testId, row.attemptId);
  }

  /**
   * The demo has a single analysis payload, so every id resolves to it — unlike
   * `getResult`, which is the contract endpoint and 404s on an unknown id.
   */
  async getResultDetailResponse(id: string): Promise<ApiResultDetail> {
    await latency();
    if (isImportedTest(id)) {
      if (!canReviewImportedTest(id)) throw new ApiError(403, 'test_not_submitted');
      return toApiResultDetail(useCompletedTestsStore.getState().tests[id].result);
    }
    if (!this.results.has(id)) throw new ApiError(404, 'result_not_found', `No result ${id}`);
    return toApiResultDetail({ ...sampleDetail(), id });
  }

  async getResultPaper(id: string): Promise<ReviewQuestion[]> {
    await latency();
    let testId: string;
    let answers = new Map<string, AnswerPatchInput>();
    if (isImportedTest(id)) {
      if (!canReviewImportedTest(id)) throw new ApiError(403, 'test_not_submitted');
      testId = id;
      const state = useAttemptStore.getState();
      const importedPaper = paperOf(findMeta(testId));
      answers = new Map(
        importedPaper.map((question, index) => [
          question.id,
          {
            question_id: question.id,
            choice: state.answers[index + 1] ?? null,
            marked: state.marked[index + 1] === true,
          },
        ]),
      );
    } else {
      const result = this.results.get(id);
      if (!result) throw new ApiError(404, 'result_not_found', `No result ${id}`);
      testId = result.testId;
      answers = this.attempts.get(result.attemptId)?.answers ?? answers;
    }
    return paperOf(findMeta(testId)).map((question, index) => {
      const answer = answers.get(question.id);
      return {
        ...toApiPaper(question),
        your_choice: answer?.choice ?? null,
        marked: answer?.marked ?? false,
        correct_choice: question.correct,
        explanation: question.explanation,
        seconds: SAMPLE_RESULT.review[index]?.seconds ?? question.avgSeconds,
      };
    });
  }

  async getResultDetail(id: string): Promise<ResultDetail> {
    return mapResultDetail(await this.getResultDetailResponse(id));
  }

  async getReviewPaper(id: string): Promise<ReviewPaperQuestion[]> {
    return (await this.getResultPaper(id)).map(mapReviewQuestion);
  }

  /**
   * SAMPLE_RESULT projected onto the contract's ResultSchema, made internally coherent:
   * the fixture's wrong/skipped *rates* (out of its 100-mark paper) are scaled onto this
   * pattern, apportioned across sections by largest remainder, and the headline score is
   * the sum of the section marks rather than a number copied from the fixture. Rank and
   * the cut-off percentage stay fixture values; everything else is derived.
   */
  private buildResult(id: string, testId: string, attemptId: string | null): Result {
    const meta = findMeta(testId);
    const pattern = meta.pattern;
    const paper = paperOf(meta);
    const total = pattern.totalQuestions;
    const sizes = pattern.sections.map((s) => s.questions);

    const rate = (n: number) => Math.round((n / SAMPLE_RESULT.maxScore) * total);
    const wrongTotal = Math.max(0, Math.min(total, rate(SAMPLE_RESULT.wrong)));
    const skippedTotal = Math.max(0, Math.min(total - wrongTotal, rate(SAMPLE_RESULT.skipped)));
    const wrongBy = apportion(wrongTotal, sizes);
    const skippedBy = apportion(skippedTotal, sizes);

    let correctAll = 0;
    let wrongAll = 0;
    const per_section: SectionScore[] = pattern.sections.map((spec, i) => {
      const wrong = Math.min(wrongBy[i], spec.questions);
      const skipped = Math.min(skippedBy[i], spec.questions - wrong);
      const correct = spec.questions - wrong - skipped;
      correctAll += correct;
      wrongAll += wrong;
      return {
        section_id: spec.id,
        name: localize(spec.labelKey),
        correct,
        wrong,
        skipped,
        marks: correct * pattern.marksPerCorrect - wrong * pattern.negativePerWrong,
      };
    });

    const score = per_section.reduce((sum, s) => sum + s.marks, 0);
    const max_score = total * pattern.marksPerCorrect;
    const cutoff = (SAMPLE_RESULT.cutoffPct / 100) * max_score;
    const attempted = correctAll + wrongAll;

    // The answer key comes from the paper question the review row points at, never from
    // the review row itself: one copy of the truth, so the two cannot drift apart.
    const wrong: WrongAnswer[] = SAMPLE_RESULT.review
      .flatMap((r) => {
        const q = paper[r.questionNo - 1];
        return q && r.your !== q.correct ? [{ row: r, q }] : [];
      })
      .map(({ row, q }) => ({
        question_id: q.id,
        text: q.text,
        options: { en: [...q.options.en], te: [...q.options.te] },
        your_choice: row.your,
        correct_choice: q.correct,
        explanation: q.explanation,
      }));

    return {
      id,
      test_id: testId,
      attempt_id: attemptId,
      score,
      max_score,
      cutoff,
      qualified: score >= cutoff,
      rank: SAMPLE_RESULT.rank,
      accuracy: attempted === 0 ? 0 : correctAll / attempted,
      per_section,
      wrong,
    };
  }
}
