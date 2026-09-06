import { Ionicons } from '@expo/vector-icons';
import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { colors, typography } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import { Text as RNText } from 'react-native';

import { MarkerRow } from '../MarkerRow';
import { Measure } from '../Measure';
import { iso, Num } from '../Num';
import { Pill } from '../Pill';

/** The body line-height the mark and the trailing slot are boxed to (design review D4). */
const LINE = typography('en', 'body').lineHeight;

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
    expect(screen.getByText('Indian polity').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('12 min').props.className).toMatch(/\btext-ink3\b/);
  });

  // Study's minutes and Library's "40 questions · 60 min" are digits, and every digit in this
  // app lives in a `<Num>`, so the meta line has to take a node as well as a string.
  it('takes a node for its meta line and leaves that node its own typography', async () => {
    await render(
      <MarkerRow title="Percentages" meta={<Measure value={8} unit="min" testID="mins" />} />,
    );
    expect(screen.getByTestId('mins')).toHaveTextContent(`${iso(8)}min`);
  });

  // A composed name is built from strings: a node says nothing a label can use. On a PRESSABLE
  // row the types now make that unrepresentable — a node meta drags an `accessibilityLabel` in
  // with it (code review 4) — so the only thing left to pin is that the row says what it was
  // given and does not quietly compose half a sentence beside it.
  it('announces the caller name, not a composed half-sentence, when the meta is a node', async () => {
    await render(
      <MarkerRow
        title="Percentages"
        meta={<RNText>8 min</RNText>}
        onPress={jest.fn()}
        accessibilityLabel="Percentages 8 min"
        testID="row"
      />,
    );
    expect(screen.getByTestId('row').props.accessibilityLabel).toBe('Percentages 8 min');
  });

  // The third arm of the union: a static row is a plain `View`, so nothing composes a name and
  // the children are walked in order — a node meta reads itself and needs no label at all.
  // Affairs' summary is exactly this shape.
  it('needs no label for a node meta on a static row: the children are read as they come', async () => {
    await render(
      <MarkerRow
        title="Metro corridor opens"
        meta={<RNText>Trains now run</RNText>}
        testID="row"
      />,
    );
    const row = screen.getByTestId('row');
    expect(row.props.accessibilityLabel).toBeUndefined();
    expect(row.props.accessibilityRole).toBeUndefined();
    expect(screen.getByText('Trains now run')).toBeOnTheScreen();
  });

  // The affairs row keeps `affair-headline-<id>` and `affair-summary-<id>` where they were:
  // the pattern owns the typography, the caller owns the names (as on `PageHeader`).
  it('names its title and its meta line where the caller asks', async () => {
    await render(
      <MarkerRow
        title="Metro corridor opens"
        titleTestID="headline"
        meta="Trains now run on the first section"
        metaTestID="summary"
        testID="row"
      />,
    );
    expect(screen.getByTestId('headline')).toHaveTextContent('Metro corridor opens');
    expect(screen.getByTestId('summary')).toHaveTextContent('Trains now run on the first section');
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
      <MarkerRow
        title="Free mock 1"
        trailing={<Pill label="Free" testID="tag" />}
        chevron
        testID="row"
      />,
    );
    expect(screen.getByTestId('tag')).toBeOnTheScreen();
    const chevron = screen.getByText('›', { includeHiddenElements: true });
    expect(chevron.props.className).toMatch(/\btext-ink3\b/);
    // Order, not just presence: the pill is read before the chevron that follows it.
    expect(screen.getByTestId('row-end')).toHaveTextContent('Free›');
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
    const row = screen.getByTestId('row');
    expect(row.props.className).toMatch(/\bmin-h-touchLg\b/);
    // A fixed height would clip a Telugu title; the class is a floor, and nothing pins it.
    expect(row.props.style?.height).toBeUndefined();
  });

  // A wrapped title used to drag the mark and the date to the middle of the two lines, so the
  // dot belonged to neither (design review D4). Both slots are boxed to one body line and
  // pinned to the top, so they sit on line 1 however far the title wraps.
  it('boxes the mark and the trailing slot to line 1 of a wrapped title', async () => {
    await render(
      <MarkerRow
        title="A headline long enough to wrap onto a second line on a narrow handset"
        marker="dot"
        trailing={<Num variant="caption">{'12 Jul'}</Num>}
        chevron
        testID="row"
      />,
    );
    expect(screen.getByTestId('row-mark').props.style).toMatchObject({
      minHeight: LINE,
      alignSelf: 'flex-start',
    });
    expect(screen.getByTestId('row-end').props.style).toMatchObject({
      minHeight: LINE,
      alignSelf: 'flex-start',
    });
  });

  // A minimum, not a height: Profile's language switcher is a 48 px control in the trailing
  // slot, and a fixed line box clipped it into the row below.
  it('lets a tall trailing control grow its slot instead of clipping it', async () => {
    await render(
      <MarkerRow title="Language" trailing={<RNText testID="switcher">EN</RNText>} testID="row" />,
    );
    const end = screen.getByTestId('row-end');
    expect(end.props.style.height).toBeUndefined();
    expect(end.props.style.minHeight).toBe(LINE);
    // The row centres its parts, so a one-line title sits against the middle of that control.
    expect(screen.getByTestId('row-row')).toHaveStyle({ alignItems: 'center' });
  });

  // Home's affair headline gets two lines; Profile and Study rows grow instead (no cap).
  it('caps the title where the caller asks, and lets it grow where they do not', async () => {
    await render(<MarkerRow title="Indian polity" titleLines={2} testID="capped" />);
    expect(screen.getByText('Indian polity').props.numberOfLines).toBe(2);

    await render(<MarkerRow title="Indian polity" testID="free" />);
    expect(screen.getByText('Indian polity').props.numberOfLines).toBeUndefined();
  });

  // An explicit label stops children being composed, so a trailing date is silent unless the
  // row is told what it says (code review I3).
  it('folds a trailing label into the composed name, after the meta line', async () => {
    await render(
      <MarkerRow
        title="Cabinet clears new PRC"
        meta="Telangana"
        trailingLabel="12 Jul"
        trailing={<RNText>12 Jul</RNText>}
        onPress={jest.fn()}
        testID="row"
      />,
    );
    expect(screen.getByTestId('row').props.accessibilityLabel).toBe(
      'Cabinet clears new PRC Telangana 12 Jul',
    );
  });
});
