import { render, screen, userEvent } from '@testing-library/react-native';
import { TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import ProfileRoute from '@/app/(tabs)/profile';
import { useActivityStore } from '@/data/activity';
import { useAttemptStore } from '@/data/attempt';
import { useEligibilityStore } from '@/data/eligibility';
import { useHistoryStore } from '@/data/history';
import { useLangStore } from '@/data/lang';
import { useSessionStore } from '@/data/session';
import { wipeLocalData } from '@/data/signOut';
import { useStudyStore } from '@/data/study';

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

/**
 * What one person leaves on a shared handset besides a token: a measured body, a score, a
 * streak, a read topic — and the language, which is the handset's rather than theirs.
 */
const leaveATrail = () => {
  useEligibilityStore.getState().setGender('female');
  useEligibilityStore.getState().setValue('height', '167.6');
  useEligibilityStore.getState().check();
  useHistoryStore.getState().record({
    id: 'att-1',
    testId: 'mock-07',
    score: 30,
    maxScore: 40,
    at: Date.now(),
  });
  useActivityStore.getState().bump('answered');
  useStudyStore.getState().markRead('st-re-blood');
  useSessionStore.getState().markWelcomeSeen();
  useLangStore.setState({ lang: 'te' });
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  // Every store, not two: these tests now assert on all of them, so a leak between cases
  // would let a passing test hide a store the exits forgot.
  wipeLocalData();
  signIn();
});

afterAll(() => {
  wipeLocalData();
});

describe('ProfileRoute', () => {
  it('logging out erases every trace of the person from this handset', async () => {
    startAnAttempt();
    leaveATrail();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-logout'));
    await userEvent.press(screen.getByText('Log out and erase'));

    expect(useSessionStore.getState().token).toBeUndefined();
    // A half-finished paper left on disk would drop the next person on a shared handset
    // straight into someone else's running test.
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useAttemptStore.getState().attemptId).toBeUndefined();
    expect(useAttemptStore.getState().answers).toEqual({});
    // The reported bug: these four were read by whoever picked the phone up next.
    expect(useEligibilityStore.getState().values).toEqual({});
    expect(useEligibilityStore.getState().checked).toBe(false);
    expect(useHistoryStore.getState().attempts).toEqual([]);
    expect(useActivityStore.getState().byDay).toEqual({});
    expect(useStudyStore.getState().read).toEqual({});
    // The handset's own settings are not the person's: the language stays.
    expect(useLangStore.getState().lang).toBe('te');
    expect(useSessionStore.getState().seenWelcome).toBe(true);
    // F-19: there is an app to be signed out *into*, so the exit lands on Home, not a form.
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('deleting the account goes further: the settings too, and a fresh start', async () => {
    startAnAttempt();
    leaveATrail();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    await userEvent.press(screen.getByText('Delete everything'));

    expect(useSessionStore.getState().token).toBeUndefined();
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useHistoryStore.getState().attempts).toEqual([]);
    // What "everything" adds over a sign-out.
    expect(useLangStore.getState().lang).toBe('en');
    expect(useSessionStore.getState().seenWelcome).toBe(false);
    // The root route reads `seenWelcome`, so this lands on the welcome slides again.
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('keeps a running attempt while either confirm dialog is still open', async () => {
    startAnAttempt();
    await render(<ProfileRoute />);
    await userEvent.press(screen.getByTestId('profile-delete'));
    expect(useAttemptStore.getState().status).toBe('running');
    await userEvent.press(screen.getByText('Cancel'));
    expect(useSessionStore.getState().token).toBe('tok-1');
    expect(useAttemptStore.getState().status).toBe('running');

    await userEvent.press(screen.getByTestId('profile-logout'));
    expect(useSessionStore.getState().token).toBe('tok-1');
    await userEvent.press(screen.getByText('Cancel'));
    expect(useSessionStore.getState().token).toBe('tok-1');
    expect(useAttemptStore.getState().status).toBe('running');
    expect(mockRouter.replace).not.toHaveBeenCalled();
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
