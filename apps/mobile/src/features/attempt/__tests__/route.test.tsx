import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { AppState, BackHandler, type AppStateStatus } from 'react-native';

import TestAttemptRoute from '@/app/test/[id]/index';
import { useActivityStore } from '@/data/activity';
import { MockApi, resetApi } from '@/data/api';
import { useAttemptStore } from '@/data/attempt';
import { useHistoryStore } from '@/data/history';
import { useSessionStore } from '@/data/session';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'mock-07' }),
  useRouter: () => ({ replace: mockReplace, back: mockBack, push: jest.fn() }),
  // `Redirect` renders nothing and just records where it would have gone.
  Redirect: ({ href }: { href: unknown }) => {
    mockRedirect(href);
    return null;
  },
}));

/** The account a paper needs before it will load: F-19 turns the deep link away without one. */
const signIn = () => {
  useSessionStore.getState().setToken('tok-1');
  useSessionStore.getState().setPost('pc');
  useSessionStore.getState().setCategory('oc');
  useSessionStore.getState().completeOnboarding();
};
jest.mock('expo-network', () => ({ useNetworkState: () => ({ isConnected: true }) }));
jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn(() => Promise.resolve()),
  deactivateKeepAwake: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
}));

const T0 = Date.parse('2026-09-02T10:00:00.000Z');
/** `Num` wraps its digits in LRI…PDI isolation. */
const num = (s: string) => `⁦${s}⁩`;

let appStateHandler: ((status: AppStateStatus) => void) | undefined;
let backHandler: (() => boolean) | undefined;

/** Let the route's two API awaits and the store write settle. */
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  mockReplace.mockClear();
  mockBack.mockClear();
  mockRedirect.mockClear();
  useSessionStore.getState().logout();
  signIn();
  appStateHandler = undefined;
  backHandler = undefined;
  resetApi();
  useAttemptStore.getState().reset();
  useActivityStore.getState().reset();
  useHistoryStore.getState().reset();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateHandler = listener as (status: AppStateStatus) => void;
    return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
  });
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    backHandler = listener as () => boolean;
    return { remove: jest.fn() } as ReturnType<typeof BackHandler.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/** Mount the route and wait until the store holds a running attempt. */
async function mountRoute() {
  await render(<TestAttemptRoute />);
  await flush();
  return useAttemptStore.getState();
}

// F-19 — `ensure` covers every tap; a deep link is the one way in that never passes it.
describe('test attempt route (gate)', () => {
  it('turns a guest away before a paper is loaded or a clock is armed', async () => {
    useSessionStore.getState().logout();
    await render(<TestAttemptRoute />);
    await flush();
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
    expect(screen.queryByTestId('attempt-screen')).toBeNull();
    // Nothing was created for someone with no account to keep it in.
    expect(useAttemptStore.getState().status).toBe('idle');
  });

  it('collects the missing answers first when the account is half-made', async () => {
    useSessionStore.getState().logout();
    useSessionStore.getState().setToken('tok-1');
    await render(<TestAttemptRoute />);
    await flush();
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
    expect(useAttemptStore.getState().status).toBe('idle');
  });

  it('opens the paper for someone who has an account and both answers', async () => {
    const state = await mountRoute();
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(state.status).toBe('running');
  });
});

describe('test attempt route', () => {
  it('starts the attempt from the mock API and arms the clock', async () => {
    const state = await mountRoute();
    expect(state.status).toBe('running');
    expect(state.testId).toBe('mock-07');
    expect(state.endsAt).toBeDefined();
    // 60 minutes on the free mock, so the header shows 60:00, never a critical 00:00.
    expect(screen.getByTestId('timer-value')).toHaveTextContent(num('60:00'));
    expect(screen.getByTestId('question-text')).not.toHaveTextContent('');
  });

  it('closes the palette when the resume dialog arrives after a spell in the background', async () => {
    await mountRoute();

    const present = jest.spyOn(BottomSheetModal.prototype, 'present');
    const dismiss = jest.spyOn(BottomSheetModal.prototype, 'dismiss');

    await userEvent.press(screen.getByTestId('btn-palette'));
    expect(present).toHaveBeenCalled();
    dismiss.mockClear();

    // Away for more than the 2 s that earns a resume dialog.
    await act(async () => {
      appStateHandler?.('background');
    });
    jest.setSystemTime(T0 + 30_000);
    await act(async () => {
      appStateHandler?.('active');
    });

    expect(screen.getByTestId('dialog-resume')).toBeOnTheScreen();
    expect(dismiss).toHaveBeenCalled();
  });

  it('raises the exit dialog on hardware back, then closes it on a second back', async () => {
    await mountRoute();

    await act(async () => {
      backHandler?.();
    });
    expect(screen.getByTestId('dialog-exit')).toBeOnTheScreen();

    // A dialog is on top: back dismisses it instead of re-opening exit.
    await act(async () => {
      backHandler?.();
    });
    expect(screen.queryByTestId('dialog-exit')).toBeNull();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('leaves the attempt from the exit dialog', async () => {
    await mountRoute();
    await act(async () => {
      backHandler?.();
    });
    await userEvent.press(screen.getByText('Leave'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('records an answer in the store and advances the progress tally', async () => {
    await mountRoute();
    await userEvent.press(screen.getByTestId('option-2'));
    expect(useAttemptStore.getState().answers[1]).toBe(2);
    expect(screen.getByTestId('btn-palette')).toHaveTextContent(`Questions${num('1 / 40')}`);
  });

  it('offers a retry when the paper fails to load, and starts the attempt on the retry', async () => {
    // One rejection, then the real fixture paper: the retry has to actually re-fetch.
    const getPaper = jest
      .spyOn(MockApi.prototype, 'getPaper')
      .mockRejectedValueOnce(new Error('offline'));

    await render(<TestAttemptRoute />);
    await flush();

    // No blank stem with four blank options: the failure owns the screen.
    expect(screen.getByTestId('attempt-load-error')).toBeOnTheScreen();
    expect(screen.queryByTestId('question-text')).toBeNull();
    expect(useAttemptStore.getState().status).not.toBe('running');

    await userEvent.press(screen.getByTestId('attempt-load-error-retry'));
    await flush();

    expect(getPaper).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('attempt-load-error')).toBeNull();
    expect(useAttemptStore.getState().status).toBe('running');
    expect(screen.getByTestId('question-text')).not.toHaveTextContent('');
  });
});

/**
 * F-23 — the two things Home reads about a paper are written from here, because a store
 * that imports another store is a cycle waiting for the next feature to close it.
 */
describe('test attempt route (what it writes for Home)', () => {
  it('counts an answered question towards the day', async () => {
    await mountRoute();
    await userEvent.press(screen.getByTestId('option-2'));
    expect(useActivityStore.getState().byDay['2026-09-02']).toEqual({
      answered: 1,
      topicsRead: 0,
    });
  });

  // Changing your mind is not a second question, and the day's target would be trivial to
  // farm if it were.
  it('does not count a question answered twice twice', async () => {
    await mountRoute();
    await userEvent.press(screen.getByTestId('option-2'));
    await userEvent.press(screen.getByTestId('option-1'));
    expect(useActivityStore.getState().byDay['2026-09-02'].answered).toBe(1);
  });

  it('records the scored paper, so Home can count it and read a best score off it', async () => {
    await mountRoute();
    await userEvent.press(screen.getByTestId('option-2'));
    await userEvent.press(screen.getByTestId('btn-palette'));
    await userEvent.press(screen.getByTestId('palette-submit'));
    await userEvent.press(screen.getByText('Yes, submit'));
    await flush();

    const [row] = useHistoryStore.getState().attempts;
    expect(row).toBeDefined();
    expect(row.testId).toBe('mock-07');
    expect(row.maxScore).toBeGreaterThan(0);
    expect(row.score).toBeLessThanOrEqual(row.maxScore);
  });
});
