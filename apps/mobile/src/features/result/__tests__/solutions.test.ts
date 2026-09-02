import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';

import { buildSolutionRows, filterSolutionRows } from '../solutions';

describe('buildSolutionRows', () => {
  const paper = buildPaper(FREE_MOCK_SHORT.sections);
  const review = SAMPLE_RESULT.review.map((r) => ({ ...r }));
  const rows = buildSolutionRows(review, paper);

  it('joins every review row to its 1-based question in the paper', () => {
    expect(rows).toHaveLength(review.length);
    expect(rows[0].question).toBe(paper[rows[0].questionNo - 1]);
  });

  it('reads in paper order, not fixture order', () => {
    expect(rows.map((r) => r.questionNo)).toEqual([3, 6, 12, 15]);
  });

  it('marks a row correct only when the pick matches the key', () => {
    expect(rows.filter((r) => r.isCorrect)).toHaveLength(1);
    expect(filterSolutionRows(rows, 'wrong')).toHaveLength(3);
    expect(filterSolutionRows(rows, 'all')).toHaveLength(4);
  });

  it('treats a skipped question as wrong', () => {
    const skipped = buildSolutionRows(
      [{ questionNo: 1, your: null, correct: 0, seconds: 9 }],
      paper,
    );
    expect(skipped[0].isCorrect).toBe(false);
  });

  it('drops review rows the paper does not contain', () => {
    expect(
      buildSolutionRows([{ questionNo: 9999, your: 0, correct: 0, seconds: 1 }], paper),
    ).toEqual([]);
  });
});
