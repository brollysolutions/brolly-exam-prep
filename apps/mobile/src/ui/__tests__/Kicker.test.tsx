import { render, screen } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';
import { act } from 'react';

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
    expect(el.props.className).toContain('text-dim');
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

describe('Kicker contrast and tracking', () => {
  it('defaults to dim (7.06:1), never mute', async () => {
    await render(<Kicker testID="k">Section</Kicker>);
    expect(screen.getByTestId('k').props.className).toContain('text-dim');
    expect(screen.getByTestId('k').props.className).not.toContain('text-mute');
  });

  it('index digits share the label tracking: 2 px in English, 0 in Urdu', async () => {
    await render(
      <Kicker index="01" testID="k">
        Where you stand
      </Kicker>,
    );
    expect(screen.getByText('⁦01⁩')).toHaveStyle({ letterSpacing: 2 });
    expect(screen.getByTestId('k')).toHaveStyle({ letterSpacing: 2 });
    await act(async () => {
      await setLanguage('ur');
    });
    await render(
      <Kicker index="01" testID="k">
        آپ کہاں ہیں
      </Kicker>,
    );
    expect(screen.getByText('⁦01⁩')).toHaveStyle({ letterSpacing: 0 });
    expect(screen.getByTestId('k')).toHaveStyle({ letterSpacing: 0, fontSize: 12 });
    await act(async () => {
      await setLanguage('en');
    });
  });
});
