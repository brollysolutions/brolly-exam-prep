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
    expect(screen.getByText('Nothing yet').props.className).toMatch(/\btext-ink3\b/);
    const line = screen.getByText('No updates from the Board yet.');
    expect(line.props.className).toMatch(/\btext-ink3\b/);
    expect(line).toHaveStyle({ textAlign: 'center' });
  });

  it('empty: takes its own pill label', async () => {
    await render(<EmptyState title="All correct" message="Nothing to review." testID="empty" />);
    expect(screen.getByText('All correct')).toBeOnTheScreen();
    expect(screen.queryByText('Nothing yet')).toBeNull();
  });

  // An empty shelf is not a state, so its pill carries no dot; a not-found IS a sort of
  // failure, and takes the same red dot `LoadError` wears, so the two read as one mechanism
  // rather than two (design review D14).
  it('empty: no dot by default, and the LoadError red one on request', async () => {
    await render(<EmptyState message="Nothing on this shelf." testID="empty" />);
    expect(screen.queryByTestId('empty-pill-dot')).toBeNull();

    await render(<EmptyState message="No such topic." dotTone="danger" testID="notfound" />);
    const dot = screen.getByTestId('notfound-pill-dot');
    expect(dot.props.className).toMatch(/\bbg-dangerInk\b/);
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

  // The same pill and the same centring as `EmptyState`: one waiting family, not two
  // mechanisms. Red is the dot, not the fill — `Pill` has no red (design review D7).
  it('error: a pill with a red dot, the reason, and a 48 px outline retry', async () => {
    const onRetry = jest.fn();
    await render(<LoadError onRetry={onRetry} testID="error" />);
    const pill = screen.getByText('Problem').parent;
    expect(screen.getByText('Problem').props.className).toMatch(/\btext-ink3\b/);
    expect(pill).toBeTruthy();
    expect(screen.getByTestId('error').props.className).toMatch(/\bjustify-center\b/);
    expect(screen.getByText('The result did not load.')).toBeOnTheScreen();
    const retry = screen.getByTestId('error-retry');
    expect(retry.props.className).toMatch(/\bborder-outline\b/);
    expect(retry).toHaveStyle({ height: 48 });
    await userEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  // Both badges are the 24 px pill, so the empty and failed states read as one family.
  it('error and empty wear the same 24 px pill', async () => {
    await render(<EmptyState message="Nothing yet." testID="empty" />);
    const emptyPill = screen.getByTestId('empty').children[0];
    await render(<LoadError testID="error" />);
    const errorPill = screen.getByTestId('error').children[0];
    expect(typeof emptyPill === 'object' && emptyPill.props.style.minHeight).toBe(
      typeof errorPill === 'object' ? errorPill.props.style.minHeight : null,
    );
  });

  it('error: names what failed when the screen knows', async () => {
    await render(<LoadError message="That paper could not be opened." testID="error" />);
    expect(screen.getByText('That paper could not be opened.')).toBeOnTheScreen();
  });
});
