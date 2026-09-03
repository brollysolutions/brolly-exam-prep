import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import OtpRoute from '@/app/(auth)/otp';
import { getApi, resetApi } from '@/data/api';
import { useSessionStore } from '@/data/session';

import { setOtpRequestId } from '../otpRequest';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
const mockRedirect = jest.fn();
/** What the URL is carrying: the place the sign-in chain has to end (F-19). */
let mockParams: { returnTo?: string } = {};

// `Redirect` renders nothing and just records where it would have gone.
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

const type = async (digits: string) => {
  for (const d of digits) await userEvent.press(screen.getByLabelText(d));
};

const verify = async (code: string) => {
  await type(code);
  await userEvent.press(screen.getByTestId('otp-verify'));
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  resetApi();
  mockParams = {};
  setOtpRequestId(undefined);
  useSessionStore.getState().logout();
  useSessionStore.getState().setPhone('9000012345');
});

describe('OtpRoute', () => {
  it('sends you back to the number when no request is in flight', async () => {
    await render(<OtpRoute />);
    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/login');
    expect(screen.queryByTestId('otp-screen')).toBeNull();
  });

  it('stores the token and moves on when the code is right', async () => {
    const { request_id } = await getApi().requestOtp({ phone: '9000012345' });
    setOtpRequestId(request_id);
    await render(<OtpRoute />);
    await verify('123456');
    expect(useSessionStore.getState().token).toBeDefined();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/post');
  });

  it('carries the destination on to onboarding so the chain ends where it started', async () => {
    mockParams = { returnTo: '/test/mock-07' };
    const { request_id } = await getApi().requestOtp({ phone: '9000012345' });
    setOtpRequestId(request_id);
    await render(<OtpRoute />);
    await verify('123456');
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('keeps the destination when a reload sends it back to the number', async () => {
    mockParams = { returnTo: '/test/mock-07' };
    await render(<OtpRoute />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  // Against the mock there is no wrong code: any six digits walk on to onboarding.
  it('takes any code and moves on', async () => {
    const { request_id } = await getApi().requestOtp({ phone: '9000012345' });
    setOtpRequestId(request_id);
    await render(<OtpRoute />);
    await verify('111111');
    expect(screen.queryByTestId('otp-error')).toBeNull();
    expect(useSessionStore.getState().token).toBeTruthy();
    expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/post');
  });

  it('explains an expired request and arms the resend at once', async () => {
    setOtpRequestId('otp-gone');
    await render(<OtpRoute />);
    expect(screen.queryByTestId('otp-resend')).toBeNull();
    await verify('123456');
    expect(screen.getByTestId('otp-error')).toBeOnTheScreen();
    expect(screen.getByText('That code has expired. Ask for a new one.')).toBeOnTheScreen();
    expect(screen.getByTestId('otp-resend')).toBeOnTheScreen();
  });

  it('resending puts a fresh request in flight and closes the error', async () => {
    setOtpRequestId('otp-gone');
    await render(<OtpRoute />);
    await verify('123456');
    await userEvent.press(screen.getByTestId('otp-resend'));
    expect(screen.queryByTestId('otp-error')).toBeNull();
    // The new request verifies with the dev code.
    await verify('123456');
    expect(useSessionStore.getState().token).toBeDefined();
  });

  it('goes back to the login screen from the change-number row', async () => {
    setOtpRequestId('otp-live');
    await render(<OtpRoute />);
    await userEvent.press(screen.getByTestId('otp-change-number'));
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
