import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { iso } from '@/ui';

import { LoginView } from '../LoginView';

const type = async (digits: string) => {
  for (const d of digits) await userEvent.press(screen.getByLabelText(d));
};

/** Scoped to the field, because the keypad renders the same digits. */
const field = (value: string) => within(screen.getByTestId('login-phone')).getByText(iso(value));

describe('LoginView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('keeps continue disabled until ten digits are entered', async () => {
    await render(<LoginView onSubmit={jest.fn()} />);
    expect(screen.getByTestId('login-continue')).toBeDisabled();
    await type('900001234');
    expect(screen.getByTestId('login-continue')).toBeDisabled();
    await type('5');
    expect(screen.getByTestId('login-continue')).toBeEnabled();
  });

  // F-19 — the sign-in now sits on top of a working app, so it needs a way back to it.
  it('offers a way back when there is something behind the screen', async () => {
    const onBack = jest.fn();
    await render(<LoginView onSubmit={jest.fn()} onBack={onBack} />);
    await userEvent.press(screen.getByTestId('login-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('offers none on a first run, where there is nothing behind it', async () => {
    await render(<LoginView onSubmit={jest.fn()} />);
    expect(screen.queryByTestId('login-back')).toBeNull();
  });

  it('appends keypad digits and deletes the last one', async () => {
    await render(<LoginView onSubmit={jest.fn()} />);
    await type('98');
    expect(field('98')).toBeOnTheScreen();
    await userEvent.press(screen.getByLabelText('Delete digit'));
    expect(field('9')).toBeOnTheScreen();
  });

  it('never grows past ten digits', async () => {
    await render(<LoginView initialPhone="9000012345" onSubmit={jest.fn()} />);
    await type('7');
    expect(field('9000012345')).toBeOnTheScreen();
  });

  it('submits the completed number', async () => {
    const onSubmit = jest.fn();
    await render(<LoginView initialPhone="900001234" onSubmit={onSubmit} />);
    await type('5');
    await userEvent.press(screen.getByTestId('login-continue'));
    expect(onSubmit).toHaveBeenCalledWith('9000012345');
  });

  it('does not submit while busy', async () => {
    const onSubmit = jest.fn();
    await render(<LoginView initialPhone="9000012345" busy onSubmit={onSubmit} />);
    expect(screen.getByTestId('login-continue')).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows the error toast when one is passed', async () => {
    await render(<LoginView onSubmit={jest.fn()} error="No connection." />);
    expect(screen.getByTestId('login-error')).toBeOnTheScreen();
  });
});

describe('LoginView (te)', () => {
  beforeAll(async () => {
    await act(async () => {
      await setLanguage('te');
    });
  });

  afterAll(async () => {
    await act(async () => {
      await setLanguage('en');
    });
  });

  it('renders the Telugu copy and keeps the phone row physical', async () => {
    await render(<LoginView initialPhone="9000012345" onSubmit={jest.fn()} />);
    // A title role: Noto Serif Telugu 700 (Playfair, the English display face, has no Telugu).
    expect(screen.getByText('మీ ఫోన్ నంబర్')).toHaveStyle({
      fontFamily: 'NotoSerifTelugu_700Bold',
    });
    // The screen's own rows are all numeric, so they stay physically LTR in every language.
    expect(screen.getByTestId('login-phone')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByTestId('login-keypad-row-0')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
