import { render, screen, userEvent } from '@testing-library/react-native';
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
  it('answered is gold with ink, marked is ink with cream, not-answered a red outline', () => {
    expect(paletteState.a).toMatchObject({ bg: colors.accent, fg: colors.ink });
    expect(paletteState.m).toMatchObject({ bg: colors.ink, fg: colors.onInk });
    expect(paletteState.am).toMatchObject({ bg: colors.ink, fg: colors.onInk });
    expect(paletteState.na.bg).toBe('transparent');
    expect(paletteState.na.border).toBe(colors.dangerInk);
    expect(paletteState.nv).toMatchObject({ bg: colors.surface2, fg: colors.ink3, border: colors.line2 });
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

describe('PaletteCell current outline', () => {
  it('is a 2 px ink ring with a 2 px canvas gap (2 px border at -4 px inset)', async () => {
    await render(<PaletteCell n={3} state="a" current />);
    const outline = screen.getByTestId('palette-current');
    expect(outline.props.className).toContain('-inset-[4px]');
    expect(outline.props.className).toContain('border-2 border-ink');
  });

  it('draws the answered+marked dot gold in a cream ring', async () => {
    await render(<PaletteCell n={5} state="am" dot />);
    const dot = screen.getByTestId('palette-dot');
    expect(dot.props.className).toContain('bg-accent');
    expect(dot.props.className).toContain('border-surface');
  });
});
