import { render, screen, userEvent } from '@testing-library/react-native';
import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { SolutionsView } from '../SolutionsView';
import { buildSolutionRows } from '../solutions';

const ROWS = buildSolutionRows(
  SAMPLE_RESULT.review.map((r) => ({ ...r })),
  buildPaper(FREE_MOCK_SHORT.sections),
);

describe('SolutionsView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('opens on the wrong answers only', async () => {
    await render(<SolutionsView rows={ROWS} />);
    expect(screen.getAllByTestId('solution-card')).toHaveLength(3);
    expect(screen.getByText('Wrong (3)')).toBeOnTheScreen();
    expect(screen.getByText('All (4)')).toBeOnTheScreen();
  });

  it('shows every question once the all chip is pressed', async () => {
    await render(<SolutionsView rows={ROWS} />);
    await userEvent.press(screen.getByTestId('solutions-filter-all'));
    expect(screen.getAllByTestId('solution-card')).toHaveLength(4);
  });

  it('gives the correct card no "your answer" block', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="all" />);
    expect(screen.getAllByTestId('solution-card')).toHaveLength(4);
    expect(screen.getAllByTestId('solution-correct-answer')).toHaveLength(4);
    expect(screen.getAllByTestId('solution-your-answer')).toHaveLength(3);
  });

  it('renders your time and the crowd average per card', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="wrong" />);
    expect(screen.getAllByText(/Your time/)).toHaveLength(3);
    // Question 3 of the paper took 1m 47s in the fixture.
    expect(screen.getByText(/1m 47s/)).toBeOnTheScreen();
  });

  it('says so when the wrong filter has nothing to show', async () => {
    await render(<SolutionsView rows={ROWS.filter((r) => r.isCorrect)} initialFilter="wrong" />);
    expect(screen.queryAllByTestId('solution-card')).toHaveLength(0);
    expect(screen.getByText('No wrong answers in this test.')).toBeOnTheScreen();
  });

  it('shows the skeleton and no filters while loading', async () => {
    await render(<SolutionsView />);
    // The skeleton is hidden from assistive tech, so RNTL must be told to look at it.
    expect(
      screen.getByTestId('solutions-skeleton', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('solutions-filters')).toBeNull();
    expect(screen.queryByTestId('solutions-list')).toBeNull();
  });

  it('offers a retry when the load failed', async () => {
    const onRetry = jest.fn();
    await render(<SolutionsView failed onRetry={onRetry} />);
    expect(screen.queryByTestId('solutions-filters')).toBeNull();
    await userEvent.press(screen.getByTestId('solutions-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
