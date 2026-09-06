import { render, screen, userEvent, within } from '@testing-library/react-native';
import { colors, spacing } from '@tslprb/design-tokens';
import { buildPaper, FREE_MOCK_SHORT, SAMPLE_RESULT } from '@tslprb/fixtures';
import { i18n, initI18n } from '@tslprb/i18n';

import { SolutionsView } from '../SolutionsView';
import { buildSolutionRows } from '../solutions';

const ROWS = buildSolutionRows(
  SAMPLE_RESULT.review.map((r) => ({ ...r })),
  buildPaper(FREE_MOCK_SHORT.sections),
);

/** `test.optionKeys` in English - the glyph each option is labelled with. */
const KEYS = ['A', 'B', 'C', 'D'];

describe('SolutionsView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('opens on the wrong answers only', async () => {
    await render(<SolutionsView rows={ROWS} />);
    expect(screen.getAllByTestId('solution-card')).toHaveLength(3);
    // Label and tally are separate elements now; the tally is a `<Num>`.
    expect(screen.getByTestId('solutions-filter-wrong')).toHaveTextContent(/Wrong/);
    expect(screen.getByTestId('solutions-filter-wrong')).toHaveTextContent(/\(3\)/);
    expect(screen.getByTestId('solutions-filter-all')).toHaveTextContent(/\(4\)/);
  });

  it('shows every question once the all chip is pressed', async () => {
    await render(<SolutionsView rows={ROWS} />);
    await userEvent.press(screen.getByTestId('solutions-filter-all'));
    expect(screen.getAllByTestId('solution-card')).toHaveLength(4);
  });

  it('shows the option the paper marks correct on every card', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="all" />);
    const blocks = screen.getAllByTestId('solution-correct-answer-text');
    expect(blocks).toHaveLength(ROWS.length);
    ROWS.forEach((row, i) => {
      const key = KEYS[row.question.correct];
      expect(blocks[i]).toHaveTextContent(
        `${key} · ${row.question.options.en[row.question.correct]}`,
      );
    });
  });

  // Gold text on the gold tint is 4.14:1 (fix wave 1, C2): both kickers are ink, and the
  // 3 px edge plus the tint say which block is which.
  it('sets both answer kickers in ink on their tints', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="all" />);
    for (const block of screen.getAllByTestId('solution-correct-answer')) {
      const kicker = within(block).getByText(i18n.t('solutions.correctAnswer'));
      expect(kicker.props.className).toMatch(/\btext-ink\b/);
      expect(kicker.props.className).not.toMatch(/\btext-hivis\b/);
    }
    for (const block of screen.getAllByTestId('solution-your-answer')) {
      expect(within(block).getByText(i18n.t('solutions.yourAnswer')).props.className).toMatch(
        /\btext-ink\b/,
      );
    }
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
    expect(screen.getAllByTestId('solution-your-time')).toHaveLength(3);
    // Question 3 of the paper took 1m 47s in the fixture; the digits and the unit render
    // in different faces, so the flat form lives on the accessibility label.
    expect(screen.getByLabelText('1m 47s')).toBeOnTheScreen();
  });

  // P6, the shape every other empty screen wears — with an `ok` dot, because nothing has gone
  // wrong: the shelf is empty because every answer was right.
  it('says so when the wrong filter has nothing to show', async () => {
    await render(<SolutionsView rows={ROWS.filter((r) => r.isCorrect)} initialFilter="wrong" />);
    expect(screen.queryAllByTestId('solution-card')).toHaveLength(0);
    expect(screen.getByTestId('solutions-empty')).toBeOnTheScreen();
    expect(screen.getByText('No wrong answers in this test.')).toBeOnTheScreen();
    expect(screen.getByTestId('solutions-empty-pill-dot').props.className).toMatch(/\bbg-okInk\b/);
  });

  // The verdict disc: gold with an ink ✓ (6.47:1), `dangerInk` with a cream ✕ (5.79:1). Never
  // a cream tick on `danger`, which is 2.77:1.
  it('marks each card with a round badge in the two verdict colours', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="all" />);
    const right = screen.getAllByTestId('solution-badge-correct');
    const wrong = screen.getAllByTestId('solution-badge-wrong');
    expect(right).toHaveLength(1);
    expect(wrong).toHaveLength(3);
    expect(right[0].props.className).toMatch(/\bbg-accent\b/);
    expect(right[0].props.className).toMatch(/\brounded-full\b/);
    expect(wrong[0].props.className).toMatch(/\bbg-dangerInk\b/);
    expect(
      within(right[0]).getByText('✓', { includeHiddenElements: true }).props.className,
    ).toMatch(/\btext-ink\b/);
    expect(
      within(wrong[0]).getByText('✕', { includeHiddenElements: true }).props.className,
    ).toMatch(/\btext-onInk\b/);
  });

  // Both blocks give all three of the bar's pixels back out of the reading-side padding, so
  // the answer given and the key start their text on one axis (ruling D8).
  it('starts both answer blocks on one axis under their own tint and edge', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="wrong" />);
    const yours = screen.getAllByTestId('solution-your-answer')[0];
    const key = screen.getAllByTestId('solution-correct-answer')[0];
    expect(yours).toHaveStyle({
      backgroundColor: colors.dangerTint,
      borderLeftWidth: 3,
      borderLeftColor: colors.dangerInk,
      paddingLeft: spacing['3'] - 3,
    });
    expect(key).toHaveStyle({
      backgroundColor: colors.accentTint,
      borderLeftWidth: 3,
      borderLeftColor: colors.accentStrong,
      paddingLeft: spacing['3'] - 3,
    });
  });

  // The `sand` alias was the last gold kicker in the app.
  it('heads the explanation with the paper viewer’s Why pill', async () => {
    await render(<SolutionsView rows={ROWS} initialFilter="wrong" />);
    const why = screen.getAllByText('Why')[0];
    expect(why.props.className).toMatch(/\btext-ink3\b/);
    expect(String(why.props.className)).not.toMatch(/text-(sand|hivis|accentInk)\b/);
  });

  it('draws the two filters as pills carrying their counts', async () => {
    await render(<SolutionsView rows={ROWS} />);
    for (const id of ['solutions-filter-wrong', 'solutions-filter-all'])
      expect(screen.getByTestId(id).props.className).toMatch(/\brounded-full\b/);
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
