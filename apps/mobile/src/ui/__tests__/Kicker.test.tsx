import { render, screen } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import { Kicker } from '../Kicker';

describe('Kicker', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('passes className and rest props through when there is no index', async () => {
    await render(
      <Kicker className="mt-3" testID="kicker">
        Section
      </Kicker>,
    );
    const el = screen.getByTestId('kicker');
    expect(el.props.className).toContain('mt-3');
    expect(el.props.className).toContain('text-mute');
  });

  it('puts className on the wrapping row when an index is given', async () => {
    await render(
      <Kicker index="01" className="mt-3" testID="kicker">
        Where you stand
      </Kicker>,
    );
    expect(screen.getByText('⁦01⁩')).toBeOnTheScreen();
    expect(screen.getByTestId('kicker').props.className).not.toContain('mt-3');
  });
});
