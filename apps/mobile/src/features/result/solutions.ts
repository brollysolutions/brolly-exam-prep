import type { PaperQuestion, ResultReviewRow } from '@/data/api';

/** One card on the solutions screen: a review row joined to the paper question it refers to. */
export type SolutionRow = {
  /** 1-based number in the paper, as printed on the card. */
  questionNo: number;
  question: PaperQuestion;
  /** The option the candidate picked, or `null` when the question was skipped. */
  your: number | null;
  correct: number;
  seconds: number;
  isCorrect: boolean;
};

export type SolutionFilter = 'wrong' | 'all';

/**
 * Joins `ResultDetail.review` to the paper by 1-based question number, dropping rows the
 * paper does not contain (a result from a different pattern), and ordering by question
 * number so the list reads the way the test did. The answer key comes from the review row,
 * not the question: the review is what the attempt was marked against.
 */
export function buildSolutionRows(
  review: readonly ResultReviewRow[],
  paper: readonly PaperQuestion[],
): SolutionRow[] {
  return review
    .flatMap((row) => {
      const question = paper[row.questionNo - 1];
      if (!question) return [];
      return [
        {
          questionNo: row.questionNo,
          question,
          your: row.your,
          correct: row.correct,
          seconds: row.seconds,
          isCorrect: row.your !== null && row.your === row.correct,
        },
      ];
    })
    .sort((a, b) => a.questionNo - b.questionNo);
}

export const filterSolutionRows = (rows: SolutionRow[], filter: SolutionFilter): SolutionRow[] =>
  filter === 'all' ? rows : rows.filter((row) => !row.isCorrect);
