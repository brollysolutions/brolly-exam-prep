import { render, screen, userEvent } from '@testing-library/react-native';
import { colors, paletteState, type PaletteState } from '@tslprb/design-tokens';
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
      expect(screen.getByTestId('cell')).toHaveStyle({
        backgroundColor: s.bg,
        borderColor: s.border,
        borderWidth: s.borderWidth,
      });
      expect(screen.getByText(num(7))).toHaveStyle({ color: s.fg });
    },
  );

  it('answered is hi-vis on tar, not-answered is a flag outline', () => {
    expect(paletteState.a.bg).toBe(colors.hivis);
    expect(paletteState.na.bg).toBe('transparent');
    expect(paletteState.na.border).toBe(colors.flag);
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
