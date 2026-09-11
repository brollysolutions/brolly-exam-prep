import type { ReviewPaperQuestion } from '@/data/api';

/** One card on the solutions screen: a review row joined to the paper question it refers to. */
export type SolutionRow = {
  /** 1-based number in the paper, as printed on the card. */
  questionNo: number;
  question: ReviewPaperQuestion;
  /** The option the candidate picked, or `null` when the question was skipped. */
  your: number | null;
  /** The authorized answer key returned by the result review endpoint. */
  correct: number;
  seconds: number;
  isCorrect: boolean;
};

export type SolutionFilter = 'wrong' | 'all';

/**
 * Maps the authorized result paper to cards. Unlike the public test paper, this payload is
 * allowed to contain the candidate's choice, answer key and explanation after submission.
 */
export function buildSolutionRows(
  paper: readonly ReviewPaperQuestion[],
): SolutionRow[] {
  return paper.map((question, index) => ({
    questionNo: index + 1,
    question,
    your: question.yourChoice,
    correct: question.correct,
    seconds: question.seconds,
    isCorrect: question.yourChoice === question.correct,
  }));
}

export const filterSolutionRows = (rows: SolutionRow[], filter: SolutionFilter): SolutionRow[] =>
  filter === 'all' ? rows : rows.filter((row) => !row.isCorrect);
