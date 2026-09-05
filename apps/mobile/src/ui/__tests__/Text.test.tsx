import { act, render, screen } from '@testing-library/react-native';
import { tracking } from '@tslprb/design-tokens';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { Text } from '../Text';

describe('Text', () => {
  beforeAll(() => {
    initI18n('en');
  });
  afterEach(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('is ink by default', async () => {
    await render(<Text testID="t">EN</Text>);
    expect(screen.getByTestId('t').props.className).toContain('text-ink');
  });

  it('swaps the colour class cleanly on re-render (no stale class, plain object style)', async () => {
    await render(
      <Text color="canvas" testID="t">
        EN
      </Text>,
    );
    await screen.rerender(
      <Text color="ink3" testID="t">
        EN
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.props.className).toContain('text-ink3');
    expect(el.props.className).not.toContain('text-canvas');
    // css-interop pushes into array styles in place on web; Text must hand it an object.
    expect(Array.isArray(el.props.style)).toBe(false);
  });

  it('keeps Latin tracking when the face is en even if the UI language is Telugu', async () => {
    await act(async () => {
      await setLanguage('te');
    });
    await render(
      <Text lang="en" variant="kicker" tracking="brand" testID="t">
        TSLPRB
      </Text>,
    );
    expect(screen.getByTestId('t')).toHaveStyle({
      letterSpacing: tracking.brand,
      fontFamily: 'Inter_400Regular',
    });
    await render(
      <Text variant="kicker" tracking="brand" testID="u">
        తెలుగు
      </Text>,
    );
    expect(screen.getByTestId('u')).toHaveStyle({
      letterSpacing: 0,
      fontFamily: 'NotoSansTelugu_400Regular',
      // Kickers have their own floor per face: 12 in Telugu, not the 10.5 px kicker size.
      fontSize: 12,
    });
  });

  it('aligns to the reading start by default and `end` to the right', async () => {
    await act(async () => {
      await setLanguage('te');
    });
    await render(
      <Text testID="s" align="end">
        x
      </Text>,
    );
    // Both shipped languages read left-to-right; `writingDirection` follows `isRTL()`.
    expect(screen.getByTestId('s')).toHaveStyle({ textAlign: 'right', writingDirection: 'ltr' });
  });
});
