import { act, fireEvent, render, screen, userEvent } from '@testing-library/react-native';
import { colors, paletteState, size, type PaletteState } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { PaletteCell } from '../PaletteCell';

const STATES: PaletteState[] = ['nv', 'na', 'a', 'm', 'am'];
/** `Num` wraps digits in LRI…PDI isolation. */
const num = (n: number) => `⁦${n}⁩`;

describe('PaletteCell', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it.each(STATES)(
    'state %s paints the token background, border and number colour',
    async (state) => {
      await render(<PaletteCell n={7} state={state} testID="cell" />);
      const s = paletteState[state];
      const cell = screen.getByTestId('cell');
      expect(cell).toHaveStyle({
        backgroundColor: s.bg,
        borderColor: s.border,
        borderWidth: s.borderWidth,
        width: size.cell,
        height: size.cell,
      });
      // Not a `style` CALLBACK: css-interop cannot see inside one, so on web the cell rendered
      // with no fill or border at all (review round 1). The object form is the regression guard.
      expect(typeof cell.props.style).not.toBe('function');
      expect(screen.getByText(num(7))).toHaveStyle({ color: s.fg });
    },
  );

  it('merges a layout override (the palette grid column width) over the defaults', async () => {
    await render(<PaletteCell n={7} state="a" style={{ width: 51 }} testID="cell" />);
    expect(screen.getByTestId('cell')).toHaveStyle({ width: 51, height: size.cell });
  });

  // Brand semantics: gold = the candidate's own input, ink = a deliberate flag, red = missing.
  it('answered is gold with ink, marked is ink with cream, not-answered a red tint under red', () => {
    expect(paletteState.a).toMatchObject({ bg: colors.accent, fg: colors.ink });
    expect(paletteState.m).toMatchObject({ bg: colors.ink, fg: colors.onInk });
    expect(paletteState.am).toMatchObject({ bg: colors.ink, fg: colors.onInk });
    // The unanswered cell is filled now, not a hollow box: `dangerInk` on that tint is 5.27:1.
    expect(paletteState.na).toMatchObject({
      bg: colors.dangerTint,
      fg: colors.dangerInk,
      border: colors.dangerInk,
      borderWidth: 2,
    });
    // The quiet fill is the boundary; the `line` hairline over it is texture. `surface` would
    // be 1.00:1 against the sheet the grid sits on — a cell with no edge at all.
    expect(paletteState.nv).toMatchObject({
      bg: colors.surface2,
      fg: colors.ink3,
      border: colors.line,
    });
    expect(paletteState.nv.bg).not.toBe(colors.surface);
  });

  // Which cells have a fill worth dimming is a property of the token, not a string test in the
  // component: `bg === 'transparent'` stopped being the question the moment `na` took a tint.
  it('marks only the gold and ink cells as solid fills', () => {
    expect([paletteState.a.solid, paletteState.m.solid, paletteState.am.solid]).toEqual([
      true,
      true,
      true,
    ]);
    expect([paletteState.nv.solid, paletteState.na.solid]).toEqual([false, false]);
  });

  it('draws the current outline and the answered+marked dot', async () => {
    await render(<PaletteCell n={1} state="am" current dot />);
    expect(screen.getByTestId('palette-current')).toBeOnTheScreen();
    expect(screen.getByTestId('palette-dot')).toBeOnTheScreen();
  });

  it('draws neither outline nor dot by default', async () => {
    await render(<PaletteCell n={2} state="a" />);
    expect(screen.queryByTestId('palette-current')).toBeNull();
    expect(screen.queryByTestId('palette-dot')).toBeNull();
  });

  it('is a labelled button that reports presses', async () => {
    const onPress = jest.fn();
    await render(<PaletteCell n={12} state="nv" onPress={onPress} />);
    const cell = screen.getByLabelText('Q 12');
    expect(cell.props.accessibilityRole).toBe('button');
    await userEvent.press(cell);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('PaletteCell pressed', () => {
  // A tinted cell (not answered) has no fill to dim — 8 % red at 85 % opacity is the same 8 %
  // red — so it takes the `surface2` press fill every outlined control uses (fix wave 1).
  it('fills the not-answered cell surface2 while held, and dims the filled ones', async () => {
    await render(<PaletteCell n={4} state="na" onPress={jest.fn()} testID="cell" />);
    await act(async () => {
      fireEvent(screen.getByTestId('cell'), 'pressIn');
    });
    expect(screen.getByTestId('cell')).toHaveStyle({ backgroundColor: colors.surface2 });
    expect(screen.getByTestId('cell')).not.toHaveStyle({ opacity: 0.85 });
    await act(async () => {
      fireEvent(screen.getByTestId('cell'), 'pressOut');
    });
    expect(screen.getByTestId('cell')).toHaveStyle({ backgroundColor: colors.dangerTint });

    await screen.rerender(<PaletteCell n={4} state="a" onPress={jest.fn()} testID="cell" />);
    await act(async () => {
      fireEvent(screen.getByTestId('cell'), 'pressIn');
    });
    expect(screen.getByTestId('cell')).toHaveStyle({ opacity: 0.85, backgroundColor: colors.accent });
  });
});

describe('PaletteCell current outline', () => {
  it('is a 2 px ink ring with a 2 px canvas gap (2 px border at -4 px inset)', async () => {
    await render(<PaletteCell n={3} state="a" current />);
    const outline = screen.getByTestId('palette-current');
    expect(outline.props.className).toMatch(/(^|\s)-inset-\[4px\](\s|$)/);
    expect(outline.props.className).toMatch(/\bborder-2 border-ink\b/);
  });

  it('draws the answered+marked dot gold in a cream ring', async () => {
    await render(<PaletteCell n={5} state="am" dot />);
    const dot = screen.getByTestId('palette-dot');
    expect(dot.props.className).toMatch(/\bbg-accent\b/);
    expect(dot.props.className).toMatch(/\bborder-surface\b/);
  });
});
