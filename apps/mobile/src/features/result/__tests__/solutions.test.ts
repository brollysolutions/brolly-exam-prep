import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';

import { buildSolutionRows, filterSolutionRows } from '../solutions';

describe('buildSolutionRows', () => {
  const paper = buildPaper(FREE_MOCK_SHORT.sections);
  const review = SAMPLE_RESULT.review.map((r) => ({ ...r }));
  const reviewPaper = review.map((row) => ({
    ...paper[row.questionNo - 1],
    yourChoice: row.your,
    marked: false,
    seconds: row.seconds,
  }));
  const rows = buildSolutionRows(reviewPaper);

  it('joins every review row to its 1-based question in the paper', () => {
    expect(rows).toHaveLength(review.length);
    expect(rows[0].question).toBe(reviewPaper[0]);
  });

  it('reads in paper order, not fixture order', () => {
    expect(rows.map((r) => r.questionNo)).toEqual([1, 2, 3, 4]);
  });

  it('takes the answer key from the paper question, not the review row', () => {
    for (const row of rows) {
      expect(row.correct).toBe(reviewPaper[row.questionNo - 1].correct);
      expect(row.isCorrect).toBe(row.your === reviewPaper[row.questionNo - 1].correct);
    }
  });

  it('marks a row correct only when the pick matches the key', () => {
    expect(rows.filter((r) => r.isCorrect)).toHaveLength(1);
    expect(filterSolutionRows(rows, 'wrong')).toHaveLength(3);
    expect(filterSolutionRows(rows, 'all')).toHaveLength(4);
  });

  it('treats a skipped question as wrong', () => {
    const skipped = buildSolutionRows([
      { ...paper[0], yourChoice: null, marked: false, seconds: 9 },
    ]);
    expect(skipped[0].isCorrect).toBe(false);
    expect(skipped[0].correct).toBe(paper[0].correct);
  });

  it('numbers cards in authorized review-paper order', () => {
    expect(rows.map((row) => row.questionNo)).toEqual([1, 2, 3, 4]);
  });
});
