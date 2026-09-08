import { buildPaper, FREE_MOCK_SHORT, type ExamPattern } from '@tslprb/fixtures';

import type { Choice } from '../attempt';
import { DEFAULT_CUTOFF_PCT, scoreAttempt, type ScoreInput } from '../score';

const PAPER = buildPaper(FREE_MOCK_SHORT.sections);
/** The same paper with a quarter-mark penalty, so both marking schemes get a run. */
const NEGATIVE: ExamPattern = { ...FREE_MOCK_SHORT, negativePerWrong: 0.25 };

/** Every question answered with its own key. */
const allCorrect = (upTo = PAPER.length): Record<number, Choice> => {
  const answers: Record<number, Choice> = {};
  for (let n = 1; n <= upTo; n += 1) answers[n] = PAPER[n - 1].correct;
  return answers;
};

/** Every question answered with something that is not the key. */
const allWrong = (upTo = PAPER.length): Record<number, Choice> => {
  const answers: Record<number, Choice> = {};
  for (let n = 1; n <= upTo; n += 1) answers[n] = ((PAPER[n - 1].correct + 1) % 4) as Choice;
  return answers;
};

const score = (over: Partial<ScoreInput> = {}) =>
  scoreAttempt({
    id: 'res-local-1',
    testTitleN: 7,
    paper: PAPER,
    pattern: FREE_MOCK_SHORT,
    answers: {},
    elapsedSec: 0,
    ...over,
  });

describe('scoreAttempt — the marks', () => {
  it('gives every mark on offer when every answer is the key', () => {
    const result = score({ answers: allCorrect() });
    expect(result.score).toBe(40);
    expect(result.maxScore).toBe(40);
    expect(result.correct).toBe(40);
    expect(result.wrong).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.accuracyPct).toBe(100);
    expect(result.qualified).toBe(true);
  });

  it('gives nothing for a paper answered entirely wrong, and no negative on a paper with none', () => {
    const result = score({ answers: allWrong() });
    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
    expect(result.wrong).toBe(40);
    expect(result.negativeMarks).toBe(0);
    expect(result.accuracyPct).toBe(0);
    expect(result.qualified).toBe(false);
  });

  it('takes the penalty off when the pattern carries one', () => {
    const result = score({ answers: allWrong(), pattern: NEGATIVE });
    expect(result.score).toBe(-10); // 40 wrong × 0.25
    expect(result.negativeMarks).toBe(-10);
    expect(result.maxScore).toBe(40);
  });

  it('marks a mixed paper: 6 right, 4 wrong, the rest skipped', () => {
    const answers: Record<number, Choice> = {};
    for (let n = 1; n <= 6; n += 1) answers[n] = PAPER[n - 1].correct;
    for (let n = 7; n <= 10; n += 1) answers[n] = ((PAPER[n - 1].correct + 2) % 4) as Choice;

    const plain = score({ answers });
    expect(plain.correct).toBe(6);
    expect(plain.wrong).toBe(4);
    expect(plain.skipped).toBe(30);
    expect(plain.score).toBe(6);
    expect(plain.negativeMarks).toBe(0);
    // 6 right out of 10 attempted, not out of 40.
    expect(plain.accuracyPct).toBe(60);

    const penalised = score({ answers, pattern: NEGATIVE });
    expect(penalised.score).toBe(5); // 6 − (4 × 0.25)
    expect(penalised.negativeMarks).toBe(-1);
  });

  it('is a clean zero — never NaN — when nothing was answered', () => {
    const result = score({ elapsedSec: 900 });
    expect(result.score).toBe(0);
    expect(result.correct).toBe(0);
    expect(result.wrong).toBe(0);
    expect(result.skipped).toBe(40);
    expect(result.accuracyPct).toBe(0);
    expect(result.avgSecondsPerQuestion).toBe(0);
    expect(result.negativeMarks).toBe(0);
    expect(Number.isNaN(result.accuracyPct)).toBe(false);
  });

  it('never reports a negative zero, which JSON and the screen both read oddly', () => {
    const result = score({ answers: allCorrect(), pattern: NEGATIVE });
    expect(Object.is(result.negativeMarks, -0)).toBe(false);
    expect(result.negativeMarks).toBe(0);
  });

  it('qualifies exactly at the cut-off, not above it', () => {
    const answers = allCorrect(16); // 16 / 40 = 40%
    expect(score({ answers }).qualified).toBe(true);
    expect(score({ answers: allCorrect(15) }).qualified).toBe(false);
    expect(score({ answers }).cutoffPct).toBe(DEFAULT_CUTOFF_PCT);
  });

  it('takes a cut-off from the caller when one is given', () => {
    expect(score({ answers: allCorrect(16), cutoffPct: 50 }).qualified).toBe(false);
    expect(score({ answers: allCorrect(16), cutoffPct: 50 }).cutoffPct).toBe(50);
  });
});

/**
 * The store persists `answers` as JSON, so after a cold start the runtime keys are strings
 * ("7"), not numbers — `attempt.ts` says so in its own comment. A scorer that walked
 * `Object.keys(...).map(Number)` and compared identity would mark every one of these as
 * skipped and hand back a zero, silently, only ever on a resumed paper.
 */
describe('scoreAttempt — answers rehydrated from storage', () => {
  it('marks string-keyed answers exactly as it marks number-keyed ones', () => {
    const numeric = allCorrect();
    const rehydrated = JSON.parse(JSON.stringify(numeric)) as Record<number, Choice>;
    expect(Object.keys(rehydrated).every((k) => typeof k === 'string')).toBe(true);

    const result = score({ answers: rehydrated });
    expect(result.score).toBe(40);
    expect(result.correct).toBe(40);
    expect(result.skipped).toBe(0);
    expect(result.review.every((row) => row.your !== null)).toBe(true);
  });

  it('reads option A back as an answer, not as a blank', () => {
    const zeroKey = PAPER.findIndex((q) => q.correct === 0) + 1;
    expect(zeroKey).toBeGreaterThan(0);
    const result = score({ answers: { [zeroKey]: 0 } });
    expect(result.correct).toBe(1);
    expect(result.skipped).toBe(39);
    expect(result.review[zeroKey - 1].your).toBe(0);
  });
});

describe('scoreAttempt — the paper it was given', () => {
  /** A pattern that claims more than the paper holds: mark what exists, out of what exists. */
  it('marks a paper shorter than the pattern claims, out of the paper', () => {
    const short = PAPER.slice(0, 12);
    const result = score({ paper: short, answers: allCorrect(12) });
    expect(result.maxScore).toBe(12);
    expect(result.score).toBe(12);
    expect(result.correct).toBe(12);
    expect(result.skipped).toBe(0);
    expect(result.review).toHaveLength(12);
  });

  it('ignores an answer to a question the paper does not contain', () => {
    const short = PAPER.slice(0, 4);
    const result = score({ paper: short, answers: { ...allCorrect(4), 99: 1 } });
    expect(result.correct).toBe(4);
    expect(result.review).toHaveLength(4);
    expect(result.score).toBe(4);
  });

  it('returns an empty review and a zero for an empty paper', () => {
    const result = score({ paper: [], answers: allCorrect() });
    expect(result.review).toHaveLength(0);
    expect(result.score).toBe(0);
    expect(result.maxScore).toBe(0);
    expect(result.qualified).toBe(false);
  });
});

describe('scoreAttempt — the rest of the analysis', () => {
  it('writes one review row per question, in paper order, with the seconds it was given', () => {
    const result = score({ answers: { 1: PAPER[0].correct }, spent: { 1: 42, 2: 7 } });
    expect(result.review).toHaveLength(40);
    expect(result.review[0]).toEqual({ questionNo: 1, your: PAPER[0].correct, seconds: 42 });
    expect(result.review[1]).toEqual({ questionNo: 2, your: null, seconds: 7 });
    expect(result.review[2].seconds).toBe(0);
  });

  it('averages the time over the questions that were attempted, not over the paper', () => {
    const result = score({ answers: allCorrect(10), elapsedSec: 600 });
    expect(result.avgSecondsPerQuestion).toBe(60);
  });

  /**
   * A rank needs the pool, and a handset has no pool. Inventing one is what put the
   * fixture's "1,284 / 9,033" under every candidate's score (F-34).
   */
  it('leaves rank and the pool unknown, rather than inventing them', () => {
    const result = score({ answers: allCorrect() });
    expect(result.rank).toBeUndefined();
    expect(result.totalCandidates).toBeUndefined();
  });

  it('suggests no drills: which paper to sit next is not a marking question', () => {
    expect(score({ answers: allCorrect() }).actions).toEqual([]);
  });

  it('carries the identity the caller gave it', () => {
    const result = score({
      id: 'res-local-9',
      testTitleN: 8,
      title: { en: 'PWT 2022 — SCT PC', te: 'PWT 2022 — SCT PC' },
    });
    expect(result.id).toBe('res-local-9');
    expect(result.testTitleN).toBe(8);
    expect(result.title).toEqual({ en: 'PWT 2022 — SCT PC', te: 'PWT 2022 — SCT PC' });
  });

  it('is pure: it does not touch the answers it was handed', () => {
    const answers = allCorrect(3);
    const before = JSON.stringify(answers);
    score({ answers });
    expect(JSON.stringify(answers)).toBe(before);
  });
});
