import { act, render, screen, userEvent, within } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { initI18n, setLanguage } from '@tslprb/i18n';

import { ProfileView } from '../ProfileView';

const handlers = () => ({
  onLang: jest.fn(),
  onNotifications: jest.fn(),
  onSignIn: jest.fn(),
  onEditPost: jest.fn(),
  onEditCategory: jest.fn(),
  onLogout: jest.fn(),
  onDelete: jest.fn(),
});

const base = {
  post: 'si',
  category: 'bc',
  signedIn: true,
  notifications: true,
  version: '1.0.0',
} as const;

describe('ProfileView', () => {
  beforeAll(() => {
    initI18n('en');
  });

  it('shows the answers onboarding collected', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/SI \/ ASI/);
    expect(screen.getByTestId('profile-category')).toHaveTextContent(/BC/);
    expect(screen.getByRole('button', { name: /Post.*SI \/ ASI/ })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: /Category.*BC/ })).toBeOnTheScreen();
    expect(screen.getByTestId('profile-version')).toHaveTextContent('Version 1.0.0');
    expect(screen.getByTestId('profile-language')).toHaveTextContent(/Language/);
  });

  it('labels missing preferences as Not selected', async () => {
    await render(
      <ProfileView signedIn notifications={false} version="1.0.0" lang="en" {...handlers()} />,
    );
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/Not selected/);
    expect(screen.getByTestId('profile-category')).toHaveTextContent(/Not selected/);
  });

  it('sends you back to the onboarding steps to change an answer', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-post'));
    expect(h.onEditPost).toHaveBeenCalledTimes(1);
    await userEvent.press(screen.getByTestId('profile-category'));
    expect(h.onEditCategory).toHaveBeenCalledTimes(1);
  });

  it('toggles the daily reminder', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    const toggle = screen.getByTestId('profile-notifications');
    expect(toggle.props.accessibilityState.checked).toBe(true);
    await userEvent.press(toggle);
    expect(h.onNotifications).toHaveBeenCalledWith(false);
  });

  it('draws the reminder switch from the palette, not the platform', async () => {
    const { rerender } = await render(<ProfileView {...base} lang="en" {...handlers()} />);
    expect(screen.getByTestId('profile-notifications')).toHaveStyle({
      backgroundColor: colors.accent,
    });
    await act(async () =>
      rerender(<ProfileView {...base} notifications={false} lang="en" {...handlers()} />),
    );
    expect(screen.getByTestId('profile-notifications')).toHaveStyle({
      backgroundColor: colors.surface2,
    });
  });

  it('deletes through the danger outline — a red border, red text, no fill — and a dialog', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    // A filled button of any colour on a settings list reads as the screen's primary action;
    // the outline asks, and the dialog is where the commit happens.
    const del = screen.getByTestId('profile-delete');
    expect(del.props.className).toMatch(/\bborder-dangerInk\b/);
    expect(del.props.className).not.toMatch(/\bbg-/);
    expect(within(del).getByText(/delete/i).props.className).toMatch(/\btext-dangerInk\b/);
    await userEvent.press(del);
    expect(screen.getByTestId('profile-delete-dialog')).toBeOnTheScreen();
  });

  // The app's most destructive ASK keeps its red words. The `danger` dialog tone drew an
  // `ink3` label for one phase, which quietened the delete confirmation to the colour of a
  // caption (fix wave 1, C2). `dangerInk` on the pill's `surface2` is 5.35:1.
  it('keeps the delete confirmation red: a red pill label over a red dot', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    const pill = screen.getByTestId('profile-delete-dialog-pill');
    expect(pill.props.className).toMatch(/\bbg-surface2\b/);
    expect(within(pill).getByText(/delete account/i).props.className).toMatch(/\btext-dangerInk\b/);
    expect(within(pill).getByText(/delete account/i).props.className).not.toMatch(/\btext-ink3\b/);
    expect(screen.getByTestId('profile-delete-dialog-pill-dot').props.className).toMatch(
      /\bbg-dangerInk\b/,
    );
  });

  it('switches language inline', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByLabelText('తె'));
    expect(h.onLang).toHaveBeenCalledWith('te');
  });

  // Signing out is destructive now — it erases this phone's practice record, and nothing is
  // kept on a server — so the button asks, like the delete button beneath it.
  it('asks before logging out, and says what is erased', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    expect(screen.queryByTestId('profile-logout-dialog')).toBeNull();

    await userEvent.press(screen.getByTestId('profile-logout'));

    expect(screen.getByTestId('profile-logout-dialog')).toBeOnTheScreen();
    expect(h.onLogout).not.toHaveBeenCalled();
    // The button is the plain verb; the warning is the body's job, not the button's.
    expect(screen.getByTestId('profile-logout-dialog-primary')).toHaveTextContent('Log out');
    expect(screen.getByTestId('profile-logout-dialog-primary')).not.toHaveTextContent(/erase/i);
    expect(screen.getByText(/physical measurements/i)).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('profile-logout-dialog-primary'));

    expect(h.onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-logout-dialog')).toBeNull();
  });

  it('backs out of the log-out dialog without signing out', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-logout'));
    await userEvent.press(screen.getByTestId('profile-logout-dialog-secondary'));
    expect(screen.queryByTestId('profile-logout-dialog')).toBeNull();
    expect(h.onLogout).not.toHaveBeenCalled();
  });

  // One overlay, one question: the two exits must never be on screen together.
  it('opens one exit dialog at a time', async () => {
    await render(<ProfileView {...base} lang="en" {...handlers()} />);
    await userEvent.press(screen.getByTestId('profile-logout'));
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
    await userEvent.press(screen.getByText('Cancel'));
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(screen.queryByTestId('profile-logout-dialog')).toBeNull();
  });

  it('asks before deleting the account, and only then deletes', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(screen.getByTestId('profile-delete-dialog')).toBeOnTheScreen();
    expect(h.onDelete).not.toHaveBeenCalled();
    await userEvent.press(screen.getByText('Delete everything'));
    expect(h.onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
  });

  it('backs out of the delete dialog without touching anything', async () => {
    const h = handlers();
    await render(<ProfileView {...base} lang="en" {...h} />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    await userEvent.press(screen.getByText('Cancel'));
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
    expect(h.onDelete).not.toHaveBeenCalled();
  });
});

// F-19 — a guest gets the same settings and an offer, not a wall.
describe('ProfileView (signed out)', () => {
  const guest = { signedIn: false, notifications: true, version: '1.0.0' } as const;

  beforeAll(() => {
    initI18n('en');
  });

  it('says what an account is for and offers the one way in', async () => {
    const h = handlers();
    await render(<ProfileView {...guest} lang="en" {...h} />);
    expect(screen.getByTestId('profile-signed-out')).toBeOnTheScreen();
    expect(screen.getByText("You're not signed in")).toBeOnTheScreen();
    expect(
      screen.getByText('Sign in to keep your attempts and results on this phone.'),
    ).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('profile-signin'));
    expect(h.onSignIn).toHaveBeenCalledTimes(1);
  });

  it('offers neither exit, because there is nothing to leave', async () => {
    await render(<ProfileView {...guest} lang="en" {...handlers()} />);
    expect(screen.queryByTestId('profile-logout')).toBeNull();
    expect(screen.queryByTestId('profile-delete')).toBeNull();
    expect(screen.queryByTestId('profile-delete-dialog')).toBeNull();
  });

  it('keeps the app settings, which belong to the handset and not to an account', async () => {
    const h = handlers();
    await render(<ProfileView {...guest} lang="en" {...h} />);
    expect(screen.getByTestId('profile-language')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('profile-notifications'));
    expect(h.onNotifications).toHaveBeenCalledWith(false);
  });

  it('leaves the unanswered exam rows tappable — the tap is what asks for the account', async () => {
    const h = handlers();
    await render(<ProfileView {...guest} lang="en" {...h} />);
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/Not selected/);
    await userEvent.press(screen.getByTestId('profile-post'));
    expect(h.onEditPost).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileView (te)', () => {
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

  it('renders the Telugu setting rows and matches the snapshot', async () => {
    await render(<ProfileView {...base} lang="te" {...handlers()} />);
    expect(screen.getByText('ప్రొఫైల్')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-post-row')).toHaveStyle({ flexDirection: 'row' });
    // "On" travels toward the reading end, the right.
    expect(screen.getByTestId('profile-notifications-thumb')).toHaveStyle({ left: 23 });
    expect(screen.getByTestId('profile-notifications').props.accessibilityState.checked).toBe(true);
    // Chevrons stay Latin-faced whatever the UI language.
    expect(screen.getAllByText('›', { includeHiddenElements: true })[0]).toHaveStyle({
      fontFamily: 'Inter_400Regular',
    });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('reads the sign-in offer in Telugu', async () => {
    await render(
      <ProfileView signedIn={false} notifications version="1.0.0" lang="te" {...handlers()} />,
    );
    expect(screen.getByText('మీరు సైన్ ఇన్ కాలేదు')).toBeOnTheScreen();
    expect(screen.getByTestId('profile-signin')).toHaveTextContent('సైన్ ఇన్');
  });
});
