import { act, render, screen } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';
import { View } from 'react-native';

import { Row } from '../Row';

describe('Row', () => {
  beforeAll(() => {
    initI18n('ur');
  });

  it('mirrors to row-reverse when the language is Urdu', async () => {
    await render(
      <Row testID="row">
        <View />
      </Row>,
    );
    expect(screen.getByTestId('row')).toHaveStyle({ flexDirection: 'row-reverse' });
  });

  it('opts out of mirroring with reverse', async () => {
    await render(<Row testID="row" reverse />);
    expect(screen.getByTestId('row')).toHaveStyle({ flexDirection: 'row' });
  });

  it('is a plain row when the language is English', async () => {
    await act(async () => {
      await setLanguage('en');
    });
    await render(<Row testID="row" />);
    expect(screen.getByTestId('row')).toHaveStyle({ flexDirection: 'row' });
  });

  it('applies gap, align and justify from tokens', async () => {
    await render(<Row testID="row" gap={3} align="center" justify="between" />);
    expect(screen.getByTestId('row')).toHaveStyle({
      gap: 12,
      alignItems: 'center',
      justifyContent: 'space-between',
    });
  });
});
