import type {
  AnswerPatch,
  Attempt,
  AttemptCreate,
  LocalizedText,
  Ok,
  OtpRequest,
  OtpRequestResponse,
  OtpVerify,
  OtpVerifyResponse,
  Result,
  SectionScore,
  SubmitResponse,
  Test,
  TestSummary,
  WrongAnswer,
} from '@tslprb/api-contracts';
import {
  buildPaper,
  QUESTIONS,
  SAMPLE_RESULT,
  TESTS,
  type ExamPattern,
  type Question as PaperQuestion,
  type TestMeta,
} from '@tslprb/fixtures';
import { en, te, ur } from '@tslprb/i18n';

import { ApiError, type AppApi, type ResultDetail } from './types';

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
  return { en: read(en), te: read(te), ur: read(ur) };
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

const paperOf = (meta: TestMeta): PaperQuestion[] => buildPaper(meta.pattern.sections);

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
        options: { en: [...q.options.en], te: [...q.options.te], ur: [...q.options.ur] },
      })),
    };
  });
  return { ...toSummary(meta), sections };
}

type MockAttempt = { attempt: Attempt; testId: string; answers: Map<string, AnswerPatch> };

/**
 * In-memory ApiClient backed by @tslprb/fixtures. Attempts and results live for the life of
 * the process only - the persisted attempt store (src/data/attempt.ts) is what survives a
 * cold start, exactly as it will once the FastAPI service is real.
 */
export class MockApi implements AppApi {
  private readonly otps = new Map<string, string>();
  private readonly attempts = new Map<string, MockAttempt>();
  private readonly results = new Map<string, { testId: string; attemptId: string }>();

  async health(): Promise<{ status: string }> {
    await latency();
    return { status: 'ok' };
  }

  async requestOtp(body: OtpRequest): Promise<OtpRequestResponse> {
    await latency();
    const request_id = nextId('otp');
    this.otps.set(request_id, body.phone);
    return { request_id, dev_code: DEV_OTP };
  }

  async verifyOtp(body: OtpVerify): Promise<OtpVerifyResponse> {
    await latency();
    const phone = this.otps.get(body.request_id);
    if (phone === undefined) throw new ApiError(404, 'otp_not_found', 'Request expired');
    if (body.code !== DEV_OTP) throw new ApiError(400, 'otp_invalid', 'That code is not right');
    this.otps.delete(body.request_id);
    return { token: nextId('tok'), user: { id: `usr-${phone}`, phone } };
  }

  async listTests(): Promise<TestSummary[]> {
    await latency();
    return TESTS.map(toSummary);
  }

  async getTest(id: string): Promise<Test> {
    await latency();
    return toTest(findMeta(id));
  }

  async listTestMetas(): Promise<TestMeta[]> {
    await latency();
    return TESTS;
  }

  async getTestMeta(id: string): Promise<TestMeta> {
    await latency();
    return findMeta(id);
  }

  async getPaper(testId: string): Promise<PaperQuestion[]> {
    await latency();
    return paperOf(findMeta(testId));
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

  async patchAttemptAnswer(attemptId: string, body: AnswerPatch): Promise<Ok> {
    await latency();
    const row = this.attempts.get(attemptId);
    if (!row) throw new ApiError(404, 'attempt_not_found', `No attempt ${attemptId}`);
    row.answers.set(body.question_id, body);
    return { ok: true };
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
    return this.buildResult(id, row?.testId ?? 'mock-07', row?.attemptId ?? null);
  }

  /** The demo has a single analysis payload; every result id resolves to it. */
  async getResultDetail(_id: string): Promise<ResultDetail> {
    await latency();
    return SAMPLE_RESULT;
  }

  /** SAMPLE_RESULT projected onto the contract's ResultSchema. */
  private buildResult(id: string, testId: string, attemptId: string | null): Result {
    const meta = findMeta(testId);
    const total = meta.pattern.totalQuestions;
    const per_section: SectionScore[] = meta.pattern.sections.map((spec) => {
      const wrong = Math.round((SAMPLE_RESULT.wrong * spec.questions) / total);
      const skipped = Math.round((SAMPLE_RESULT.skipped * spec.questions) / total);
      const correct = spec.questions - wrong - skipped;
      return {
        section_id: spec.id,
        name: localize(spec.labelKey),
        correct,
        wrong,
        skipped,
        marks: correct * meta.pattern.marksPerCorrect - wrong * meta.pattern.negativePerWrong,
      };
    });
    const wrong: WrongAnswer[] = SAMPLE_RESULT.review
      .filter((r) => r.your !== r.correct)
      .map((r, i) => {
        const q = QUESTIONS[i % QUESTIONS.length];
        return {
          question_id: q.id,
          text: q.text,
          options: { en: [...q.options.en], te: [...q.options.te], ur: [...q.options.ur] },
          your_choice: r.your,
          correct_choice: r.correct,
          explanation: q.explanation,
        };
      });
    return {
      id,
      test_id: testId,
      attempt_id: attemptId,
      score: SAMPLE_RESULT.score,
      max_score: SAMPLE_RESULT.maxScore,
      cutoff: (SAMPLE_RESULT.cutoffPct / 100) * SAMPLE_RESULT.maxScore,
      qualified: SAMPLE_RESULT.qualified,
      rank: SAMPLE_RESULT.rank,
      accuracy: SAMPLE_RESULT.accuracyPct / 100,
      per_section,
      wrong,
    };
  }
}
