import { Ionicons } from '@expo/vector-icons';
import { render, screen } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';

import { Banner } from '../Banner';

describe('Banner', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('is a surface2 strip under a hairline with the offline copy by default', async () => {
    await render(<Banner testID="banner" />);
    const strip = screen.getByTestId('banner');
    expect(strip.props.className).toMatch(/\bbg-surface2\b/);
    expect(strip.props.className).toMatch(/\bborder-line\b/);
    expect(strip.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText(/offline/i)).toBeOnTheScreen();
  });

  // A glyph square said nothing about what was wrong (design review, F-28 fix wave 1, D13):
  // the icon names the condition, in ink3 so it reads as information rather than a warning.
  it('draws the cloud-offline icon in ink3, hidden from the accessibility tree', async () => {
    await render(<Banner testID="banner" />);
    const icon = screen.getByTestId('banner-icon', { includeHiddenElements: true });
    // The icon host is the glyph's Text: the name resolves to a code point in the icon font.
    const code = Ionicons.glyphMap['cloud-offline-outline'];
    const glyph = typeof code === 'number' ? String.fromCodePoint(code) : code;
    expect(icon).toHaveTextContent(glyph);
    expect(icon).toHaveStyle({ color: colors.ink3, fontSize: 16 });
    expect(icon.props.accessibilityElementsHidden).toBe(true);
    expect(screen.queryByText('■')).toBeNull();
  });

  it('takes custom copy', async () => {
    await render(<Banner text="Saved offline" />);
    expect(screen.getByText('Saved offline')).toBeOnTheScreen();
  });
});
