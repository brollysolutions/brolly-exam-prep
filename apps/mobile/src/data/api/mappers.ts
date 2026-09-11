import type {
  PaperQuestion as ApiPaperQuestion,
  ResultDetail as ApiResultDetail,
  ReviewQuestion as ApiReviewQuestion,
  TestMeta as ApiTestMeta,
} from '@tslprb/api-contracts';
import type { SectionId, TestMeta } from '@tslprb/fixtures';

import { ApiError, type PaperQuestion, type ResultDetail, type ReviewPaperQuestion } from './types';

const SECTION_IDS = new Set<SectionId>([
  'arithmetic',
  'reasoning',
  'gs',
  'telangana',
  'english',
]);

function sectionId(value: string, context: string): SectionId {
  if (SECTION_IDS.has(value as SectionId)) return value as SectionId;
  throw new ApiError(200, 'schema_mismatch', `${context} has unsupported section ${value}`);
}

function fourOptions(values: string[], context: string): [string, string, string, string] {
  if (values.length !== 4) {
    throw new ApiError(200, 'schema_mismatch', `${context} must contain exactly four options`);
  }
  return [values[0], values[1], values[2], values[3]];
}

export function mapTestMeta(value: ApiTestMeta): TestMeta {
  return {
    id: value.id,
    kind: value.kind,
    title: value.title,
    pattern: {
      id: value.pattern.id,
      post: value.pattern.post,
      totalQuestions: value.pattern.total_questions,
      durationMinutes: value.pattern.duration_minutes,
      marksPerCorrect: value.pattern.marks_per_correct,
      negativePerWrong: value.pattern.negative_per_wrong,
      qualifyingOnly: value.pattern.qualifying_only,
      sections: value.pattern.sections.map((section) => ({
        id: sectionId(section.id, `test ${value.id}`),
        labelKey: section.label_key,
        questions: section.questions,
        unlockAfter:
          section.unlock_after == null
            ? undefined
            : sectionId(section.unlock_after, `test ${value.id}`),
      })),
      verified: value.pattern.verified,
      source: value.pattern.source,
    },
    fullMocksOnly: value.full_mocks_only,
    listed: value.listed,
    free: value.free,
    attempted:
      value.attempted == null
        ? undefined
        : { bestScore: value.attempted.best_score, attempts: value.attempted.attempts },
  };
}

export function mapPaperQuestion(value: ApiPaperQuestion): PaperQuestion {
  return {
    id: value.id,
    section: sectionId(value.section, `question ${value.id}`),
    text: value.text,
    options: {
      en: fourOptions(value.options.en, `question ${value.id} English`),
      te: fourOptions(value.options.te, `question ${value.id} Telugu`),
    },
    avgSeconds: value.avg_seconds,
  };
}

export function mapResultDetail(value: ApiResultDetail): ResultDetail {
  return {
    id: value.id,
    testTitleN: value.test_title_n,
    title: value.title ?? undefined,
    score: value.score,
    maxScore: value.max_score,
    cutoffPct: value.cutoff_pct,
    qualified: value.qualified,
    rank: value.rank ?? undefined,
    totalCandidates: value.total_candidates ?? undefined,
    accuracyPct: value.accuracy_pct,
    avgSecondsPerQuestion: value.avg_seconds_per_question,
    negativeMarks: value.negative_marks,
    correct: value.correct,
    wrong: value.wrong,
    skipped: value.skipped,
    actions: value.actions,
    review: value.review.map((row) => ({
      questionNo: row.question_no,
      your: row.your,
      seconds: row.seconds,
    })),
  };
}

export function mapReviewQuestion(value: ApiReviewQuestion): ReviewPaperQuestion {
  return {
    ...mapPaperQuestion(value),
    yourChoice: value.your_choice,
    marked: value.marked,
    correct: value.correct_choice,
    explanation: value.explanation,
    seconds: value.seconds,
  };
}
