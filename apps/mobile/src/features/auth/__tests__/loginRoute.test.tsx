import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import LoginRoute from '@/app/(auth)/login';
import { resetApi } from '@/data/api';
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
  it('carries the destination on to the code screen', async () => {
    mockParams = { returnTo: '/test/mock-07' };
    await render(<LoginRoute />);
    await type('9000012345');
    await userEvent.press(screen.getByTestId('login-continue'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/otp',
      params: { returnTo: '/test/mock-07' },
    });
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
