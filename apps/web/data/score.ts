import type { ExamPattern, Question as PaperQuestion } from '@tslprb/fixtures/src/runtime';

import type { LocalizedCopy, ResultDetail, ResultReviewRow } from './api/types';
import type { Choice } from './attempt';

/**
 * The published PWT qualifying percentage (OC). It is a figure about the exam, not about the
 * candidate, so it is a constant here rather than anything derived from the marks — the
 * category-wise figures live in `CATEGORIES` and are a separate ruling, not a marking rule.
 */
export const DEFAULT_CUTOFF_PCT = 40;

export type ScoreInput = {
  /** Result id to stamp on the analysis. */
  id: string;
  /** "PWT Full Mock 07" → 7, for the header when the paper has no title of its own. */
  testTitleN: number;
  title?: LocalizedCopy;
  /** The paper as the candidate saw it: index `n - 1` is question `n`. */
  paper: readonly PaperQuestion[];
  pattern: ExamPattern;
  /** Keyed by 1-based question number — the attempt store's own shape. */
  answers: Readonly<Record<number, Choice>>;
  /** Seconds banked against each question, keyed the same way. Absent = never opened. */
  spent?: Readonly<Record<number, number>>;
  /** Whole seconds the paper was open. */
  elapsedSec: number;
  cutoffPct?: number;
};

type Verdict = 'correct' | 'wrong' | 'skipped';

/** Marks land on quarters; the sum of a few dozen of them must not print as 62.249999999. */
const round2 = (n: number): number => Math.round(n * 1e2) / 1e2;

/**
 * Marks a paper on the handset — the app's own opinion of a result, and the fallback for
 * when the server cannot give one (F-34).
 *
 * Pure by construction: no store, no API, no clock. Everything it needs is an argument, so
 * it can be called from a route, from `MockApi`, or from a test with a literal, and the
 * three cannot drift.
 *
 * Two rules that look like details and are not:
 *
 * 1. Answers are read as `answers[n]`, never by walking `Object.keys`. The store persists
 *    them as JSON, so on a resumed paper the runtime keys are strings ("7"); a scorer that
 *    mapped keys to numbers and compared identity would mark every question skipped and
 *    hand back a silent zero.
 * 2. The paper bounds the marking. A pattern that claims more questions than the paper
 *    holds is marked out of the paper, so "every answer right" is always full marks.
 */
export function scoreAttempt(input: ScoreInput): ResultDetail {
  const { paper, pattern, answers, spent, elapsedSec } = input;
  const total = Math.min(pattern.totalQuestions, paper.length);
  const cutoffPct = input.cutoffPct ?? DEFAULT_CUTOFF_PCT;

  const verdicts: Verdict[] = [];
  const review: ResultReviewRow[] = [];
  for (let n = 1; n <= total; n += 1) {
    const chosen = answers[n];
    verdicts.push(
      chosen === undefined ? 'skipped' : chosen === paper[n - 1].correct ? 'correct' : 'wrong',
    );
    review.push({ questionNo: n, your: chosen ?? null, seconds: spent?.[n] ?? 0 });
  }

  // Section by section, then summed — the headline must be the sum of its parts, because
  // that is how the analysis screen and the contract's `per_section` are read against it.
  let score = 0;
  let offset = 0;
  for (const spec of pattern.sections) {
    const slice = verdicts.slice(offset, offset + spec.questions);
    offset += spec.questions;
    const correct = slice.filter((v) => v === 'correct').length;
    const wrong = slice.filter((v) => v === 'wrong').length;
    score += correct * pattern.marksPerCorrect - wrong * pattern.negativePerWrong;
  }

  const correct = verdicts.filter((v) => v === 'correct').length;
  const wrong = verdicts.filter((v) => v === 'wrong').length;
  const skipped = total - correct - wrong;
  const attempted = correct + wrong;
  const maxScore = total * pattern.marksPerCorrect;
  const penalty = wrong * pattern.negativePerWrong;

  return {
    id: input.id,
    testTitleN: input.testTitleN,
    title: input.title,
    score: round2(score),
    maxScore,
    cutoffPct,
    // Exactly at the cut-off qualifies, and a paper with no marks on offer never does.
    qualified: maxScore > 0 && score >= (cutoffPct / 100) * maxScore,
    // Of what was attempted, not of the paper: skipping is not the same mistake as guessing.
    accuracyPct: attempted === 0 ? 0 : Math.round((correct / attempted) * 100),
    avgSecondsPerQuestion: attempted === 0 ? 0 : elapsedSec / attempted,
    // `-0` is a real value in JS and prints oddly everywhere it lands, so the zero case is
    // taken first rather than negated into existence.
    negativeMarks: penalty === 0 ? 0 : -round2(penalty),
    correct,
    wrong,
    skipped,
    // Rank, the pool and the drills are all facts this handset does not hold. Absent, not
    // invented: see `ResultDetail`.
    actions: [],
    review,
  };
}
