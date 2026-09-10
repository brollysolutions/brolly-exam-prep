import type { PaperQuestion, ResultReviewRow } from '@/data/api';

/** One card on the solutions screen: a review row joined to the paper question it refers to. */
export type SolutionRow = {
  /** 1-based number in the paper, as printed on the card. */
  questionNo: number;
  question: PaperQuestion & { correct: 0 | 1 | 2 | 3; explanation: { en: string; te: string } };
  /** The option the candidate picked, or `null` when the question was skipped. */
  your: number | null;
  /** The key, straight off `question.correct`. */
  correct: number;
  seconds: number;
  isCorrect: boolean;
};

export type SolutionFilter = 'wrong' | 'all';

/**
 * Joins `ResultDetail.review` to the paper by 1-based question number, dropping rows the
 * paper does not contain (a result from a different pattern), and ordering by question
 * number so the list reads the way the test did.
 *
 * The answer key comes from the paper question, never from the review row: the row is a
 * record of what the candidate did, and a second copy of the key travelling beside it could
 * contradict the options the card actually renders.
 */
export function buildSolutionRows(
  review: readonly ResultReviewRow[],
  paper: readonly PaperQuestion[],
): SolutionRow[] {
  return review
    .flatMap((row) => {
      const question = paper[row.questionNo - 1];
      if (!question || question.correct === undefined || !question.explanation) return [];
      return [
        {
          questionNo: row.questionNo,
          question: question as SolutionRow['question'],
          your: row.your,
          correct: question.correct,
          seconds: row.seconds,
          isCorrect: row.your === question.correct,
        },
      ];
    })
    .sort((a, b) => a.questionNo - b.questionNo);
}

export const filterSolutionRows = (rows: SolutionRow[], filter: SolutionFilter): SolutionRow[] =>
  filter === 'all' ? rows : rows.filter((row) => !row.isCorrect);
