import { act, render, screen } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { Glyph } from '../Glyph';

describe('Glyph', () => {
  beforeAll(() => {
    initI18n('ur');
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('keeps the Latin face in Urdu, where Nastaliq has no chevron', async () => {
    await render(<Glyph testID="glyph">{'‹'}</Glyph>);
    expect(screen.getByTestId('glyph')).toHaveStyle({ fontFamily: 'Archivo_400Regular' });
  });

  it('honours weight and variant while staying Latin', async () => {
    await render(
      <Glyph testID="glyph" variant="body" weight="600">
        ■
      </Glyph>,
    );
    expect(screen.getByTestId('glyph')).toHaveStyle({ fontFamily: 'Archivo_600SemiBold' });
  });
});
