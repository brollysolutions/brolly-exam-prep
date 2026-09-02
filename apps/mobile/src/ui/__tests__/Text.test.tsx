import { act, render, screen } from '@testing-library/react-native';
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

  it('swaps the colour class cleanly on re-render (no stale class, plain object style)', async () => {
    await render(
      <Text color="tar" testID="t">
        EN
      </Text>,
    );
    await screen.rerender(
      <Text color="dim" testID="t">
        EN
      </Text>,
    );
    const el = screen.getByTestId('t');
    expect(el.props.className).toContain('text-dim');
    expect(el.props.className).not.toContain('text-tar');
    // css-interop pushes into array styles in place on web; Text must hand it an object.
    expect(Array.isArray(el.props.style)).toBe(false);
  });

  it('keeps Latin tracking when the face is en even if the UI language is Urdu', async () => {
    await act(async () => {
      await setLanguage('ur');
    });
    await render(
      <Text lang="en" variant="kicker" tracking="brand" testID="t">
        TSLPRB
      </Text>,
    );
    expect(screen.getByTestId('t')).toHaveStyle({
      letterSpacing: 3.4,
      fontFamily: 'Archivo_400Regular',
    });
    await render(
      <Text variant="kicker" tracking="brand" testID="u">
        اردو
      </Text>,
    );
    expect(screen.getByTestId('u')).toHaveStyle({
      letterSpacing: 0,
      fontFamily: 'NotoNastaliqUrdu_400Regular',
      fontSize: 12,
    });
  });

  it('aligns to the reading start by default and mirrors end', async () => {
    await act(async () => {
      await setLanguage('ur');
    });
    await render(
      <Text testID="s" align="end">
        x
      </Text>,
    );
    expect(screen.getByTestId('s')).toHaveStyle({ textAlign: 'left', writingDirection: 'rtl' });
  });
});
