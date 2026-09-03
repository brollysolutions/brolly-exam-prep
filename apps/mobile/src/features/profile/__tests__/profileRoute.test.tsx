import { render, screen, userEvent } from '@testing-library/react-native';
import { TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import ProfileRoute from '@/app/(tabs)/profile';
import { useAttemptStore } from '@/data/attempt';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };

/** Everything answered — the only state in which a settings row is an edit and not a sign-up. */
const signIn = () => {
  useSessionStore.getState().setToken('tok-1');
  useSessionStore.getState().setPhone('9000012345');
  useSessionStore.getState().setPost('si');
  useSessionStore.getState().setCategory('bc');
  useSessionStore.getState().completeOnboarding();
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

/** A paper in progress, the thing that must not survive either exit. */
const startAnAttempt = () => {
  useAttemptStore.getState().start(TESTS[0]);
  useAttemptStore.getState().answer(1, 2);
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  useAttemptStore.getState().reset();
  useSessionStore.getState().logout();
  signIn();
});

describe('ProfileRoute', () => {
  it('logging out clears the attempt as well as the session', async () => {
    startAnAttempt();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-logout'));

    expect(useSessionStore.getState().token).toBeUndefined();
    // A half-finished paper left on disk would drop the next person on a shared handset
    // straight into someone else's running test.
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useAttemptStore.getState().attemptId).toBeUndefined();
    expect(useAttemptStore.getState().answers).toEqual({});
    // F-19: there is an app to be signed out *into*, so the exit lands on Home, not a form.
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('deleting the account clears both stores by the same route', async () => {
    startAnAttempt();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    await userEvent.press(screen.getByText('Delete everything'));

    expect(useSessionStore.getState().token).toBeUndefined();
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useAttemptStore.getState().answers).toEqual({});
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('keeps a running attempt while the confirm dialog is still open', async () => {
    startAnAttempt();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(useAttemptStore.getState().status).toBe('running');
    await userEvent.press(screen.getByText('Cancel'));
    expect(useSessionStore.getState().token).toBe('tok-1');
    expect(useAttemptStore.getState().status).toBe('running');
  });

  it('sends an edit back to Profile instead of walking the sign-up flow on', async () => {
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-post'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/(tabs)/profile' },
    });
    await userEvent.press(screen.getByTestId('profile-category'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/category',
      params: { returnTo: '/(tabs)/profile' },
    });
  });
});

// F-19 — the settings are readable without an account; only the account part is missing.
describe('ProfileRoute (guest)', () => {
  beforeEach(() => {
    useSessionStore.getState().logout();
  });

  it('offers a sign-in where the two exits would be', async () => {
    await render(<ProfileRoute />);
    expect(screen.getByTestId('profile-signed-out')).toBeOnTheScreen();
    expect(screen.queryByTestId('profile-logout')).toBeNull();
    await userEvent.press(screen.getByTestId('profile-signin'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)/profile' },
    });
  });

  it('turns an exam row into the same sign-in, not an edit of nothing', async () => {
    await render(<ProfileRoute />);
    expect(screen.getByTestId('profile-post')).toHaveTextContent(/—/);
    await userEvent.press(screen.getByTestId('profile-post'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)/profile' },
    });
  });

  it('collects the missing answers first for someone signed in mid-sign-up', async () => {
    useSessionStore.getState().setToken('tok-1');
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-category'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/(tabs)/profile' },
    });
  });
});
