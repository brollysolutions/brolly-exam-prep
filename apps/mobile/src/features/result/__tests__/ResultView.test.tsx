import { render, screen, userEvent } from '@testing-library/react-native';
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
