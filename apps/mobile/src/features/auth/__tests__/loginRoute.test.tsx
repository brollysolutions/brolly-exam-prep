import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import LoginRoute from '@/app/(auth)/login';
import { getApi, resetApi } from '@/data/api';
import { useSessionStore } from '@/data/session';

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  navigate: jest.fn(),
  canGoBack: () => mockCanGoBack,
};
let mockCanGoBack = true;
let mockParams: { returnTo?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

const type = async (digits: string) => {
  for (const d of digits) await userEvent.press(screen.getByLabelText(d));
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  resetApi();
  mockCanGoBack = true;
  mockParams = {};
  useSessionStore.getState().logout();
});

describe('LoginRoute', () => {
  // The OTP screen went on 2026-09-07: the number is the whole sign-in, so the next screen
  // is the first onboarding question and the session exists before it renders.
  it('signs in on the number alone and carries the destination on to onboarding', async () => {
    mockParams = { returnTo: '/test/mock-07' };
    await render(<LoginRoute />);
    await type('9000012345');
    await userEvent.press(screen.getByTestId('login-continue'));

    expect(useSessionStore.getState().token).toBeTruthy();
    expect(useSessionStore.getState().userId).toBe('usr-9000012345');
    expect(useSessionStore.getState().phone).toBe('9000012345');
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
    // No intermediate screen to push to any more.
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('signs in with no destination when nothing asked for the account', async () => {
    await render(<LoginRoute />);
    await type('9000012345');
    await userEvent.press(screen.getByTestId('login-continue'));
    expect(useSessionStore.getState().signedIn()).toBe(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/post');
  });

  // The number reaches the server, so the screen has to survive the server not being there.
  it('keeps the candidate on the screen, signed out, when the call fails', async () => {
    jest.spyOn(getApi(), 'signInWithPhone').mockRejectedValueOnce(new Error('offline'));
    await render(<LoginRoute />);
    await type('9000012345');
    await userEvent.press(screen.getByTestId('login-continue'));

    expect(useSessionStore.getState().signedIn()).toBe(false);
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(await screen.findByText(/went wrong|network|try again/i)).toBeOnTheScreen();
  });

  // F-19 — the sign-in is a card on top of a working app, not the door to it.
  it('offers a way back to whatever asked for the account', async () => {
    await render(<LoginRoute />);
    await userEvent.press(screen.getByTestId('login-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('offers none when a deep link left nothing behind it', async () => {
    mockCanGoBack = false;
    await render(<LoginRoute />);
    expect(screen.queryByTestId('login-back')).toBeNull();
  });
});
