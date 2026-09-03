import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Chip } from '../Chip';

describe('Chip', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a plain, non-disabled view when static (no onPress)', async () => {
    await render(<Chip label="Marked" active tone="hazard" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el.props.accessibilityRole).toBeUndefined();
    expect(el.props.accessibilityState).toEqual({ selected: true });
    expect(el.props.className).toContain('bg-hazard');
  });

  it('is a button that reports presses when interactive', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Free" onPress={onPress} />);
    await userEvent.press(screen.getByRole('button', { name: 'Free' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('renders a count as an isolated, tabular <Num> beside the label', async () => {
    await render(<Chip label="Wrong" count={3} testID="chip" />);
    const el = screen.getByTestId('chip');
    // The tally is wrapped in LRI ... PDI, so it never re-orders inside an RTL line.
    const [LRI, PDI] = [String.fromCharCode(0x2066), String.fromCharCode(0x2069)];
    expect(el).toHaveTextContent(`Wrong${LRI}(3)${PDI}`);
  });

  it('only reports disabled when actually disabled', async () => {
    await render(<Chip label="Locked" onPress={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  // Nastaliq at chip size is a 27.7 px line box plus overhang: a fixed 34 px chip clips it
  // (design review, F-23-25). The size is a floor, and the padding is what keeps it a chip.
  it('sizes by a minimum height with vertical padding, never a fixed box', async () => {
    await render(<Chip label="Notification" testID="chip" />);
    const el = screen.getByTestId('chip');
    expect(el.props.className).toContain('min-h-chip');
    expect(el.props.className).toContain('py-1');
    expect(el.props.className).not.toMatch(/(^|\s)h-chip(\s|$)/);
  });

  it.each([
    ['md', 'min-h-chipMd'],
    ['lg', 'min-h-touch'],
  ] as const)('keeps the %s floor', async (size, cls) => {
    await render(<Chip label="Sign in" size={size} testID="chip" />);
    expect(screen.getByTestId('chip').props.className).toContain(cls);
  });

  // A tag on a card ("Sample data", a notice kind) is quieter than the heading it sits beside:
  // a kicker on panel3, no border, no yellow, and never a control.
  it('draws a label tone as a small, quiet, non-interactive tag', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Sample data" tone="label" testID="chip" onPress={onPress} />);
    const el = screen.getByTestId('chip');
    expect(el.props.accessibilityRole).toBeUndefined();
    expect(screen.queryByRole('button')).toBeNull();
    expect(el.props.className).toContain('bg-panel3');
    expect(el.props.className).toContain('rounded-xs');
    expect(el.props.className).not.toContain('bg-hivis');
    expect(el.props.className).not.toContain('border-line');
    expect(el.props.className).not.toContain('min-h-chip');
    const text = screen.getByText('Sample data');
    expect(text).toHaveStyle({ fontSize: 10.5, fontFamily: 'Archivo_700Bold' });
    expect(text.props.className).toContain('text-dim');
  });
});
