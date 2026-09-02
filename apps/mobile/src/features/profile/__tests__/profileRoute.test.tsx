import { render, screen, userEvent } from '@testing-library/react-native';
import { TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import ProfileRoute from '@/app/(tabs)/profile';
import { useAttemptStore } from '@/data/attempt';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() };

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
  useSessionStore.getState().setToken('tok-1');
  useSessionStore.getState().setPhone('9000012345');
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
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
  });

  it('deleting the account clears both stores by the same route', async () => {
    startAnAttempt();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    await userEvent.press(screen.getByText('Delete everything'));

    expect(useSessionStore.getState().token).toBeUndefined();
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useAttemptStore.getState().answers).toEqual({});
    expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/login');
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
    expect(mockRouter.push).toHaveBeenCalledWith('/(onboarding)/post?returnTo=profile');
    await userEvent.press(screen.getByTestId('profile-category'));
    expect(mockRouter.push).toHaveBeenCalledWith('/(onboarding)/category?returnTo=profile');
  });
});
