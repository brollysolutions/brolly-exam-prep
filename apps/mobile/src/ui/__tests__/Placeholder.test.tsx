import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { EmptyState, LoadError, Skeleton } from '../Placeholder';

describe('Placeholder — the three waiting states', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('empty: a quiet pill over one ink3 line, centred', async () => {
    await render(<EmptyState message="No updates from the Board yet." testID="empty" />);
    expect(screen.getByTestId('empty').props.className).toMatch(/\bjustify-center\b/);
    expect(screen.getByText('Nothing yet').props.className).toContain('text-ink3');
    const line = screen.getByText('No updates from the Board yet.');
    expect(line.props.className).toContain('text-ink3');
    expect(line).toHaveStyle({ textAlign: 'center' });
  });

  it('empty: takes its own pill label', async () => {
    await render(<EmptyState title="All correct" message="Nothing to review." testID="empty" />);
    expect(screen.getByText('All correct')).toBeOnTheScreen();
    expect(screen.queryByText('Nothing yet')).toBeNull();
  });

  // Nothing animates, so there is nothing for reduced motion to switch off; and an assistive
  // user gets the real content when it arrives, not a description of grey boxes.
  it('skeleton: static surface2 blocks, hidden from the reader', async () => {
    await render(<Skeleton blocks={['kicker', 'score', 'card']} testID="skeleton" />);
    const stack = screen.getByTestId('skeleton', { includeHiddenElements: true });
    expect(stack.props.importantForAccessibility).toBe('no-hide-descendants');
    const blocks = stack.props.children;
    expect(blocks).toHaveLength(3);
    expect(String(blocks[0].props.className)).toMatch(/\bbg-surface2\b/);
  });

  it('error: a red pill, the reason, and a 48 px outline retry', async () => {
    const onRetry = jest.fn();
    await render(<LoadError onRetry={onRetry} testID="error" />);
    expect(screen.getByText('Problem').props.className).toContain('text-dangerInk');
    expect(screen.getByText('The result did not load.')).toBeOnTheScreen();
    const retry = screen.getByTestId('error-retry');
    expect(retry.props.className).toMatch(/\bborder-outline\b/);
    expect(retry).toHaveStyle({ height: 48 });
    await userEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('error: names what failed when the screen knows', async () => {
    await render(<LoadError message="That paper could not be opened." testID="error" />);
    expect(screen.getByText('That paper could not be opened.')).toBeOnTheScreen();
  });
});
