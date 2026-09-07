import { render, screen } from '@testing-library/react-native';
import { colors, size } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { HeaderBand } from '../HeaderBand';

describe('HeaderBand', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a 4 px red rule above the bar it belongs to', async () => {
    await render(<HeaderBand />);
    const band = screen.getByTestId('header-band', { includeHiddenElements: true });
    expect(band).toHaveStyle({ height: size.band, backgroundColor: colors.dangerInk });
  });

  // The band replaced a pulsing `Rail`: it is a plain View with no entering/exiting preset,
  // so there is no motion for `useReducedMotion` to switch off.
  it('never animates, so reduced motion needs no branch', async () => {
    await render(<HeaderBand />);
    const band = screen.getByTestId('header-band', { includeHiddenElements: true });
    expect(band.props.entering).toBeUndefined();
    expect(band.props.exiting).toBeUndefined();
    expect(typeof band.props.style).not.toBe('function');
  });

  it('says nothing to a screen reader — the toast carries the warning', async () => {
    await render(<HeaderBand />);
    const band = screen.getByTestId('header-band', { includeHiddenElements: true });
    expect(band.props.accessibilityElementsHidden).toBe(true);
    expect(band.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  // Always 4 px of the header's height, showing or not: mounted into flow at the sixty-second
  // mark the band pushed the clock it was warning about down the screen (fix wave 1, D10).
  it('keeps its 4 px and drops only the fill when the clock is not critical', async () => {
    await render(<HeaderBand critical={false} />);
    const band = screen.getByTestId('header-band', { includeHiddenElements: true });
    expect(band).toHaveStyle({ height: size.band, backgroundColor: 'transparent' });
    expect(band).not.toHaveStyle({ backgroundColor: colors.dangerInk });

    await screen.rerender(<HeaderBand critical />);
    expect(screen.getByTestId('header-band', { includeHiddenElements: true })).toHaveStyle({
      height: size.band,
      backgroundColor: colors.dangerInk,
    });
  });

  it('takes its own testID and a layout className', async () => {
    await render(<HeaderBand testID="band" className="mb-1" />);
    expect(screen.getByTestId('band', { includeHiddenElements: true }).props.className).toMatch(
      /\bmb-1\b/,
    );
  });
});
