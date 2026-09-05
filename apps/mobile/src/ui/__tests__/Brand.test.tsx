import { act, render, screen } from '@testing-library/react-native';
import { colors, tracking } from '@tslprb/design-tokens';
import { initI18n, setLanguage } from '@tslprb/i18n';
import { processColor } from 'react-native';

import { Brand, LOGO_RATIO, UMBRELLA_RATIO } from '../Brand';

/** The umbrella and the logo raster are decorative: hidden from the tree, so queries must opt in. */
const hidden = { includeHiddenElements: true };

describe('Brand', () => {
  beforeAll(() => {
    initI18n('en');
  });
  afterEach(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  // The lockup follows the logo's own structure (design review, F-28 fix wave 1, D10):
  // "Brolly" is the italic, "Solutions" the roman set with the brand tracking, beside a
  // 22 px umbrella.
  it('is a header named after the company: umbrella, italic "Brolly", tracked roman "Solutions"', async () => {
    await render(<Brand testID="brand" />);
    const lockup = screen.getByRole('header', { name: 'Brolly Solutions' });
    expect(lockup.props.testID).toBe('brand');
    expect(screen.getByTestId('brand-umbrella', hidden)).toHaveStyle({ height: 22 });
    expect(screen.getByText('Brolly')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
      letterSpacing: 0,
    });
    expect(screen.getByText('Solutions')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_400Regular',
      letterSpacing: tracking.brand,
    });
    // Ink on cream: the wordmark is text, never gold.
    expect(screen.getByText('Brolly').props.className).toMatch(/\btext-ink\b/);
    expect(screen.getByText('Solutions').props.className).toMatch(/\btext-ink\b/);
  });

  it('scales the umbrella with `size` and keeps the raster aspect', async () => {
    await render(<Brand size={40} testID="brand" />);
    const { width, height } = screen.getByTestId('brand-umbrella', hidden).props.style;
    expect(height).toBe(40);
    expect(width / height).toBeCloseTo(UMBRELLA_RATIO, 1);
  });

  it('never leaves the Latin display face, whatever the UI language', async () => {
    await act(async () => {
      await setLanguage('te');
    });
    await render(<Brand testID="brand" />);
    expect(screen.getByRole('header', { name: 'Brolly Solutions' })).toBeOnTheScreen();
    expect(screen.getByText('Brolly')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
    });
    expect(screen.getByText('Solutions')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_400Regular',
      letterSpacing: tracking.brand,
    });
  });

  it('splash is the full logo image with the accessible name, at the raster aspect', async () => {
    await render(<Brand variant="splash" testID="brand" />);
    expect(screen.getByRole('image', { name: 'Brolly Solutions' }).props.testID).toBe('brand');
    const { width, height } = screen.getByTestId('brand-logo', hidden).props.style;
    expect(width).toBe(200);
    expect(width / height).toBeCloseTo(LOGO_RATIO, 1);
    expect(screen.queryByText('Brolly')).toBeNull();
  });

  it('tints the umbrella with the ink token', async () => {
    await render(<Brand testID="brand" />);
    // expo-image resolves the colour through `processColor`; the ink token is what went in.
    expect(screen.getByTestId('brand-umbrella', hidden).props.tintColor).toBe(
      processColor(colors.ink),
    );
  });
});
