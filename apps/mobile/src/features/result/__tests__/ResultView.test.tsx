import { render, screen, userEvent } from '@testing-library/react-native';
import { colors, spacing } from '@tslprb/design-tokens';
import { SAMPLE_RESULT } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import type { ResultDetail } from '@/data/api';

import { ResultView } from '../ResultView';

const RESULT: ResultDetail = {
  ...SAMPLE_RESULT,
  actions: SAMPLE_RESULT.actions.map((a) => ({
    id: a.id,
    title: { ...a.title },
    sub: { ...a.sub },
  })),
  review: SAMPLE_RESULT.review.map((r) => ({ ...r })),
};

describe('ResultView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('renders the score against the maximum', async () => {
    await render(<ResultView result={RESULT} />);
    expect(screen.getByTestId('result-score')).toHaveTextContent(/62\.25/);
    expect(screen.getByText(/\/ 100/)).toBeOnTheScreen();
  });

  it('shows the qualified chip and the cut-off', async () => {
    await render(<ResultView result={RESULT} />);
    expect(screen.getByTestId('result-qualified')).toBeOnTheScreen();
    expect(screen.getByText('Qualified')).toBeOnTheScreen();
    expect(screen.getByText(/40%/)).toBeOnTheScreen();
  });

  it('flags a result below the cut-off instead', async () => {
    await render(<ResultView result={{ ...RESULT, qualified: false }} />);
    expect(screen.getByText('Below cut-off')).toBeOnTheScreen();
    expect(screen.queryByText('Qualified')).toBeNull();
  });

  // A verdict is a `Chip`: gold when it passed, the red tint under a red outline when it did
  // not — `dangerInk` on that tint measures 5.27:1, and it is the label as well as the edge.
  it('paints the verdict gold when qualified and red-on-tint when not', async () => {
    await render(<ResultView result={RESULT} />);
    expect(screen.getByTestId('result-qualified').props.className).toMatch(/\bbg-accentSoft\b/);
    expect(screen.getByText('Qualified').props.className).toMatch(/\btext-ink\b/);

    await render(<ResultView result={{ ...RESULT, qualified: false }} />);
    expect(screen.getByTestId('result-qualified').props.className).toMatch(/\bbg-dangerTint\b/);
    expect(screen.getByText('Below cut-off').props.className).toMatch(/\btext-dangerInk\b/);
  });

  // The score card is the screen's ONE gold-edged card: three drill cards under it with an
  // edge each would point at none of them. `accentStrong`, not `accent` (2.42:1 on the card).
  it('gives the score card the screen’s only gold start edge, in ink', async () => {
    await render(<ResultView result={RESULT} />);
    const card = screen.getByTestId('result-score-card');
    expect(card).toHaveStyle({ borderLeftWidth: 3, borderLeftColor: colors.accentStrong });
    // The bar replaces the card's own 1 px `line`, so two of its three pixels come back.
    expect(card).toHaveStyle({ paddingLeft: spacing['4'] - 2 });
    expect(screen.getByTestId('result-score').props.className).toMatch(/\btext-ink\b/);

    for (const action of screen.getAllByTestId('result-action'))
      expect(action.props.style?.borderLeftWidth).toBeUndefined();
  });

  // A printed index is not the candidate's own input, and `accentInk` on a pill's `surface2`
  // is 4.25:1: the three section heads are pills carrying an `ink3` numeral (F-30, A2).
  it('numbers its three section heads on quiet pills, never in gold', async () => {
    await render(<ResultView result={RESULT} />);
    for (const index of ['01', '02', '03'])
      expect(screen.getByText(`⁦${index}⁩`).props.className).toMatch(/\btext-ink3\b/);
    // The cost figures ARE the candidate's own, and sit on `surface` at 4.77:1.
    expect(screen.getAllByTestId('result-cost-row')).toHaveLength(3);
  });

  // `ActionBar` owns the bottom inset, so the screen must not pad for it too.
  it('puts the CTA in the sticky bar and stops padding for the inset itself', async () => {
    await render(<ResultView result={RESULT} />);
    const bar = screen.getByTestId('result-actions');
    expect(bar.props.className).toMatch(/\bbg-surface\b/);
    expect(bar.props.className).toMatch(/\bborder-t border-line\b/);
    expect(screen.getByTestId('result-screen').props.style.paddingBottom).toBe(0);
  });

  it('renders three stand rows, three cost rows and three drill cards', async () => {
    await render(<ResultView result={RESULT} />);
    expect(screen.getAllByTestId('result-stand-row')).toHaveLength(3);
    expect(screen.getAllByTestId('result-cost-row')).toHaveLength(3);
    expect(screen.getAllByTestId('result-action')).toHaveLength(RESULT.actions.length);
    // `<Num>` isolates its content in LRI/PDI, so this matches on a pattern, not equality.
    expect(screen.getByText(/1,284 \/ 9,033/)).toBeOnTheScreen();
    // The duration renders as digits + unit in different faces; the row speaks it flat.
    expect(screen.getByLabelText('Avg time per question 54s')).toBeOnTheScreen();
  });

  /**
   * F-34 — a rank is a fact about every other candidate, so a paper marked on the handset
   * has none and the API returns `rank: null` for a fresh result. The line goes; it is
   * never filled with the sample fixture's pool.
   */
  it('drops the rank line when the rank and the pool are unknown', async () => {
    const local: ResultDetail = { ...RESULT, rank: undefined, totalCandidates: undefined };
    await render(<ResultView result={local} />);
    expect(screen.getAllByTestId('result-stand-row')).toHaveLength(2);
    expect(screen.queryByText('Rank')).toBeNull();
    expect(screen.queryByText(/1,284/)).toBeNull();
    // The row that leads now is accuracy, so it must not draw a divider against the card.
    expect(screen.getAllByTestId('result-stand-row')[0].props.className).not.toMatch(/border-t/);
  });

  it('calls back for the CTA and for a drill card', async () => {
    const onSeeWrong = jest.fn();
    const onAction = jest.fn();
    await render(<ResultView result={RESULT} onSeeWrong={onSeeWrong} onAction={onAction} />);
    await userEvent.press(screen.getByTestId('result-cta'));
    expect(onSeeWrong).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getAllByTestId('result-action')[0]);
    expect(onAction).toHaveBeenCalledWith(RESULT.actions[0]);
  });

  it('shows skeleton blocks and no CTA while loading', async () => {
    await render(<ResultView />);
    // The skeleton is hidden from assistive tech, so RNTL must be told to look at it.
    expect(
      screen.getByTestId('result-skeleton', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('result-cta')).toBeNull();
  });

  it('offers a retry when the load failed', async () => {
    const onRetry = jest.fn();
    await render(<ResultView failed onRetry={onRetry} />);
    expect(screen.getByText('Problem')).toBeOnTheScreen();
    expect(screen.getByText('The result did not load.')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('result-error-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
