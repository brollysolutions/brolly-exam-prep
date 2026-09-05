import { Ionicons } from '@expo/vector-icons';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { MarkerRow } from '../MarkerRow';
import { Pill } from '../Pill';

/** The icon host is the glyph's Text: a name resolves to a code point in the icon font. */
const glyph = (name: keyof typeof Ionicons.glyphMap) => {
  const code = Ionicons.glyphMap[name];
  return typeof code === 'number' ? String.fromCodePoint(code) : code;
};

describe('MarkerRow', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('puts an ink 600 title over an ink3 meta line', async () => {
    await render(<MarkerRow title="Indian polity" meta="12 min" testID="row" />);
    expect(screen.getByText('Indian polity').props.className).toContain('text-ink');
    expect(screen.getByText('12 min').props.className).toContain('text-ink3');
  });

  it('marks what is still to do with a gold dot', async () => {
    await render(<MarkerRow title="Indian polity" marker="dot" testID="row" />);
    const dot = screen.getByTestId('row-marker');
    expect(dot.props.className).toMatch(/\bbg-accentStrong\b/);
    expect(dot.props.className).toMatch(/\brounded-full\b/);
  });

  it('marks what is done with an ink check and what is locked with an ink3 lock', async () => {
    await render(<MarkerRow title="Indian polity" marker="done" testID="done" />);
    const check = screen.getByTestId('done-marker', { includeHiddenElements: true });
    expect(check).toHaveTextContent(glyph('checkmark-circle'));
    expect(check).toHaveStyle({ color: colors.ink });

    await render(<MarkerRow title="Mock 4" marker="locked" testID="locked" />);
    const lock = screen.getByTestId('locked-marker', { includeHiddenElements: true });
    expect(lock).toHaveTextContent(glyph('lock-closed-outline'));
    expect(lock).toHaveStyle({ color: colors.ink3 });
  });

  it('draws no mark by default', async () => {
    await render(<MarkerRow title="Language" testID="row" />);
    expect(screen.queryByTestId('row-marker', { includeHiddenElements: true })).toBeNull();
  });

  it('takes a trailing pill and an ink3 chevron, in that order', async () => {
    await render(
      <MarkerRow title="Free mock 1" trailing={<Pill label="Free" testID="tag" />} chevron testID="row" />,
    );
    expect(screen.getByTestId('tag')).toBeOnTheScreen();
    const chevron = screen.getByText('›', { includeHiddenElements: true });
    expect(chevron.props.className).toContain('text-ink3');
  });

  // The hairline sits on top, so the last row never draws a line against the card's border.
  it('draws a hairline over every row but the first', async () => {
    await render(<MarkerRow title="Post" first testID="first" />);
    expect(String(screen.getByTestId('first').props.className)).not.toMatch(/border-t/);

    await render(<MarkerRow title="Category" testID="next" />);
    expect(screen.getByTestId('next').props.className).toMatch(/\bborder-t border-line\b/);
  });

  it('is a plain view until it is given somewhere to go', async () => {
    await render(<MarkerRow title="Language" testID="row" />);
    expect(screen.getByTestId('row').props.accessibilityRole).toBeUndefined();

    const onPress = jest.fn();
    await render(<MarkerRow title="Post" onPress={onPress} testID="tap" />);
    expect(screen.getByTestId('tap').props.accessibilityRole).toBe('button');
    expect(screen.getByTestId('tap').props.accessibilityLabel).toBe('Post');
    await userEvent.press(screen.getByTestId('tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('reads its meta as part of its name, and fills surface2 while held', async () => {
    await render(<MarkerRow title="Post" meta="SI / ASI" onPress={jest.fn()} testID="row" />);
    expect(screen.getByTestId('row').props.accessibilityLabel).toBe('Post SI / ASI');
    await act(async () => {
      fireEvent(screen.getByTestId('row'), 'pressIn');
    });
    expect(screen.getByTestId('row').props.className).toMatch(/\bbg-surface2\b/);
  });

  // 56 px is the floor, not the height: a title over its meta grows the row, and a Telugu
  // title grows it further instead of being clipped.
  it('is at least 56 px tall and never fixed', async () => {
    await render(<MarkerRow title="Post" testID="row" />);
    expect(screen.getByTestId('row-row').props.className).toMatch(/\bmin-h-touchLg\b/);
  });
});
