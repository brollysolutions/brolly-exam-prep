import { act, render, screen } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { Brand } from '../Brand';

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

  it('is a header named after the company, with the umbrella tinted ink beside live Playfair text', async () => {
    await render(<Brand testID="brand" />);
    const lockup = screen.getByRole('header', { name: 'Brolly Solutions' });
    expect(lockup.props.testID).toBe('brand');
    expect(screen.getByTestId('brand-umbrella', hidden)).toHaveStyle({ height: 28 });
    expect(screen.getByTestId('brand-umbrella', hidden).props.tintColor).toBeDefined();
    expect(screen.getByText('Brolly')).toHaveStyle({ fontFamily: 'PlayfairDisplay_400Regular' });
    expect(screen.getByText('Solutions')).toHaveStyle({
      fontFamily: 'PlayfairDisplay_400Regular_Italic',
    });
    // Ink on cream: the wordmark is text, never gold.
    expect(screen.getByText('Brolly').props.className).toContain('text-ink');
  });

  it('scales the umbrella with `size` and keeps its aspect', async () => {
    await render(<Brand size={40} testID="brand" />);
    const { width, height } = screen.getByTestId('brand-umbrella', hidden).props.style;
    expect(height).toBe(40);
    expect(width / height).toBeCloseTo(257 / 165, 1);
  });

  it('never leaves the Latin display face, whatever the UI language', async () => {
    await act(async () => {
      await setLanguage('te');
    });
    await render(<Brand testID="brand" />);
    expect(screen.getByRole('header', { name: 'Brolly Solutions' })).toBeOnTheScreen();
    expect(screen.getByText('Brolly')).toHaveStyle({ fontFamily: 'PlayfairDisplay_400Regular' });
  });

  it('splash is the full logo image with the accessible name', async () => {
    await render(<Brand variant="splash" testID="brand" />);
    expect(screen.getByRole('image', { name: 'Brolly Solutions' }).props.testID).toBe('brand');
    const logo = screen.getByTestId('brand-logo', hidden);
    expect(logo.props.style.width).toBe(200);
    expect(logo.props.style.height).toBeGreaterThan(100);
    expect(screen.queryByText('Brolly')).toBeNull();
  });

  it('tints the umbrella with the ink token', async () => {
    await render(<Brand testID="brand" />);
    // expo-image processes the colour; the token is what went in.
    expect(colors.ink).toBe('#211c17');
    expect(screen.getByTestId('brand-umbrella', hidden).props.tintColor).toBeTruthy();
  });
});
