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

  it('takes its own testID and a layout className', async () => {
    await render(<HeaderBand testID="band" className="mb-1" />);
    expect(screen.getByTestId('band', { includeHiddenElements: true }).props.className).toMatch(
      /\bmb-1\b/,
    );
  });
});
