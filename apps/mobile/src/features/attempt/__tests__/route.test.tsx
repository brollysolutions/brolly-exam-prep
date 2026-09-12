import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';
import { paperForTest, SI_MOCK_01_ID, TESTS } from '@tslprb/fixtures';
import { AppState, BackHandler, type AppStateStatus } from 'react-native';

import TestAttemptRoute from '@/app/test/[id]/index';
import SIMockTestRoute from '@/app/tests/simocktest';
import { useActivityStore } from '@/data/activity';
import { getApi, resetApi } from '@/data/api';
import { MockApi } from '@/data/testing/mockApi';
import { useAttemptStore } from '@/data/attempt';
import { useHistoryStore } from '@/data/history';
import { useCompletedTestsStore } from '@/data/completedTests';
import { useSessionStore } from '@/data/session';

const durableMock = jest.requireMock<{
  __mockDurableAttemptService: {
    findLatest: jest.Mock;
    restore: jest.Mock;
    saveProgress: jest.Mock;
  };
}>('@/data/offline/durableAttempts').__mockDurableAttemptService;
const syncRequestMock = jest.requireMock<{
  requestAnswerSyncForCurrentUser: jest.Mock;
}>('@/data/offline/answerSync').requestAnswerSyncForCurrentUser;
const submissionRequestMock = jest.requireMock<{
  requestCurrentAttemptSubmission: jest.Mock;
}>('@/data/offline/submissionSync').requestCurrentAttemptSubmission;

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRedirect = jest.fn();
let mockTestId = 'mock-07';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: mockTestId }),
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

it('starts a test with a dummy number without creating a server attempt', async () => {
  useSessionStore.getState().startTestingSession('0000000000');
  useSessionStore.getState().setPost('pc');
  useSessionStore.getState().setCategory('oc');
  useSessionStore.getState().completeOnboarding();
  const createAttempt = jest.spyOn(getApi(), 'createAttempt');
  await render(<TestAttemptRoute />);
  await flush();
  expect(useAttemptStore.getState().status).toBe('running');
  expect(mockRedirect).not.toHaveBeenCalled();
  expect(createAttempt).not.toHaveBeenCalled();
});

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  mockReplace.mockClear();
  mockBack.mockClear();
  mockRedirect.mockClear();
  mockTestId = 'mock-07';
  useCompletedTestsStore.getState().reset();
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
  await render(mockTestId === SI_MOCK_01_ID ? <SIMockTestRoute /> : <TestAttemptRoute />);
  await flush();
  return useAttemptStore.getState();
}

describe('imported SI mock attempt', () => {
  const meta = TESTS.find((t) => t.id === SI_MOCK_01_ID)!;
  const paper = paperForTest(meta);

  it('redirects an old SI bookmark without starting a second attempt', async () => {
    mockTestId = SI_MOCK_01_ID;
    await render(<TestAttemptRoute />);
    expect(mockRedirect).toHaveBeenCalledWith('/tests/simocktest');
    expect(useAttemptStore.getState().status).toBe('idle');
  });

  it('retains the new URL as the return target when sign-in is required', async () => {
    useSessionStore.getState().logout();
    await render(<SIMockTestRoute />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/tests/simocktest' },
    });
    expect(useAttemptStore.getState().status).toBe('idle');
  });

  it('resumes the same stored SI attempt at the new URL after a reload', async () => {
    useAttemptStore.getState().start(meta, { attemptId: 'si-resume', endsAt: T0 + 600_000 });
    useAttemptStore.getState().answer(1, paper[0].correct);
    useAttemptStore.getState().goto(51);
    await render(<SIMockTestRoute />);
    await flush();
    expect(useAttemptStore.getState()).toMatchObject({
      attemptId: 'si-resume',
      current: 51,
      endsAt: T0 + 600_000,
      answers: { 1: paper[0].correct },
    });
    expect(screen.getByTestId('question-text')).toHaveTextContent(paper[50].text.en);
  });

  it('shows questions only, then stores the actual score on manual submission', async () => {
    mockTestId = SI_MOCK_01_ID;
    const create = jest.spyOn(MockApi.prototype, 'createAttempt');
    await mountRoute();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByTestId('question-text')).toHaveTextContent(paper[0].text.en);
    expect(screen.queryByText(paper[0].explanation.en)).toBeNull();
    expect(screen.queryByTestId('solution-correct-answer')).toBeNull();
    await userEvent.press(screen.getByTestId(`option-${paper[0].correct}`));
    await userEvent.press(screen.getByTestId('btn-palette'));
    await userEvent.press(screen.getByTestId('palette-submit'));
    await userEvent.press(screen.getByText('Yes, submit'));
    expect(useCompletedTestsStore.getState().tests[meta.id].result).toMatchObject({
      score: 1,
      maxScore: 200,
      correct: 1,
      wrong: 0,
      skipped: 199,
    });
    expect(mockReplace).toHaveBeenCalledWith('/test/simocktest/result');
  });

  it('scores an expired resumed attempt even if the clock expires before the paper loads', async () => {
    mockTestId = SI_MOCK_01_ID;
    useAttemptStore.getState().start(meta, { attemptId: 'si-expired', endsAt: T0 + 1000 });
    useAttemptStore.getState().answer(1, paper[0].correct);
    jest.setSystemTime(T0 + 2000);
    await mountRoute();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    await flush();
    expect(useAttemptStore.getState().status).toBe('autoSubmitted');
    expect(useAttemptStore.getState().attemptId).toBe('si-expired');
    expect(useCompletedTestsStore.getState().tests[meta.id].result.score).toBe(1);
    expect(screen.getByTestId('dialog-auto')).toBeOnTheScreen();
  });
});

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
  it('hydrates the exact question and answers from the durable local attempt', async () => {
    useSessionStore.getState().setUserId('user-1');
    const meta = TESTS.find((test) => test.id === 'mock-07')!;
    const paper = paperForTest(meta);
    const local = {
      userId: 'user:user-1',
      id: 'local-resume-1',
      testId: meta.id,
      serverAttemptId: 'server-resume-1',
      startedAt: T0,
      endsAt: T0 + 600_000,
      status: 'running',
      currentQuestion: 2,
      currentQuestionId: paper[1].id,
      currentEnteredAt: T0 + 5_000,
      sectionUnlocked: [true, true, true, false],
      createdAt: T0,
      updatedAt: T0 + 5_000,
    };
    durableMock.findLatest.mockResolvedValueOnce(local);
    durableMock.restore.mockResolvedValueOnce({
      attempt: local,
      meta,
      paper,
      answers: [
        {
          userId: 'user:user-1',
          attemptId: local.id,
          questionId: paper[0].id,
          questionNo: 1,
          choice: 2,
          marked: true,
          visited: true,
          revision: 1,
          syncState: 'dirty',
          updatedAt: T0 + 4_000,
        },
      ],
    });

    await render(<TestAttemptRoute />);
    await flush();

    expect(useAttemptStore.getState()).toMatchObject({
      attemptId: local.id,
      serverAttemptId: local.serverAttemptId,
      current: 2,
      answers: { 1: 2 },
      marked: { 1: true },
      visited: { 1: true, 2: true },
      endsAt: local.endsAt,
    });
    expect(screen.getByTestId('question-text')).toHaveTextContent(paper[1].text.en);

    await userEvent.press(screen.getByTestId('option-3'));
    await flush();
    expect(durableMock.saveProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        attemptId: local.id,
        currentQuestionId: paper[1].id,
        choice: 3,
        queueAnswerSync: true,
      }),
    );
    expect(syncRequestMock).toHaveBeenCalledTimes(1);
  });

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

    const resultId = useAttemptStore.getState().resultId;
    expect(resultId).toMatch(/^res-/);
    expect(mockReplace).toHaveBeenCalledWith(`/test/${resultId}/result`);
    const [row] = useHistoryStore.getState().attempts;
    expect(row).toBeDefined();
    expect(row.testId).toBe('mock-07');
    expect(row.maxScore).toBeGreaterThan(0);
    expect(row.score).toBeLessThanOrEqual(row.maxScore);
  });

  it('saves a manual submission locally when offline without inventing a result', async () => {
    submissionRequestMock.mockResolvedValueOnce({
      completed: [],
      pending: 1,
      failed: 0,
      permanentFailures: 0,
      skipped: 0,
      pausedForAuth: false,
      offline: true,
    });
    await mountRoute();
    await userEvent.press(screen.getByTestId('btn-palette'));
    await userEvent.press(screen.getByTestId('palette-submit'));
    await userEvent.press(screen.getByText('Yes, submit'));
    await flush();

    expect(screen.getByTestId('dialog-pending-submit')).toBeOnTheScreen();
    expect(useAttemptStore.getState()).toMatchObject({
      status: 'pendingSubmit',
      resultId: undefined,
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
