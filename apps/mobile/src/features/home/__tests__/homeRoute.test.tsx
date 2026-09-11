import { render, screen, userEvent } from '@testing-library/react-native';
import { TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import HomeRoute from '@/app/(tabs)/index';
import { useActivityStore } from '@/data/activity';
import { useAttemptStore } from '@/data/attempt';
import { useHistoryStore } from '@/data/history';
import { useSessionStore } from '@/data/session';
import { useStudyStore } from '@/data/study';
import { iso } from '@/ui';

const durableMock = jest.requireMock<{
  __mockDurableAttemptService: { findLatest: jest.Mock };
}>('@/data/offline/durableAttempts').__mockDurableAttemptService;

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };

/**
 * RNTL matches a plain string against the WHOLE text content of a node, so one line of a card
 * has to be asked for as a pattern rather than as a string.
 */
const has = (text: string) => new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => void) => {
    // Fetched here rather than imported: `jest.mock` is hoisted above the imports.
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]);
  },
}));

/** Everything answered: the state in which nothing should be asked for again. */
const signIn = () => {
  useSessionStore.getState().setToken('tok-1');
  useSessionStore.getState().setPhone('9000012345');
  useSessionStore.getState().setPost('si');
  useSessionStore.getState().setCategory('bc');
  useSessionStore.getState().completeOnboarding();
};

/** A paper armed and two questions answered: Home used to resume it, and now must not. */
const startMock = () => {
  const attempt = useAttemptStore.getState();
  attempt.start(TESTS[0]);
  attempt.answer(1, 0);
  attempt.answer(2, 1);
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.getState().logout();
  useStudyStore.getState().reset();
  useActivityStore.getState().reset();
  useHistoryStore.getState().reset();
  useAttemptStore.getState().reset();
});

describe('HomeRoute (guest)', () => {
  it('renders the whole dashboard with no account at all', async () => {
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
    expect(screen.getByTestId('home-signin')).toBeOnTheScreen();
    expect(screen.getByTestId('home-progress-nudge')).toBeOnTheScreen();
  });

  it('counts down to the notified exam date', async () => {
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-exam-date')).toHaveTextContent(
      `Preliminary Written Test · ${iso('18-10-2026')}`,
    );
  });

  it('sends the header link back to the dashboard it was pressed on', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-signin'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)' },
    });
  });

  // Tests is a tab; the hero is a fact, not a second way there (design review 9).
  it('does not turn the countdown into a button', async () => {
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-hero').props.accessibilityRole).toBeUndefined();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });
});

// Removed at the user's request (2026-09-03): Home no longer offers anything to continue,
// whatever the stores hold. The tab bar is where Study and Tests live.
describe('HomeRoute — no Continue card', () => {
  it('shows nothing to continue, even with a paper still running', async () => {
    startMock();
    await render(<HomeRoute />);
    expect(screen.queryByTestId('home-continue')).toBeNull();
    expect(screen.queryByTestId('home-continue-action')).toBeNull();
    expect(screen.queryByText('Still running')).toBeNull();
    expect(screen.queryByText(has('Statehood movement'))).toBeNull();
  });

  // The tag moved to the screens the seeded content actually lives on: a heading and a tag
  // beside it read as one object (design review D3).
  it('keeps the sample-data tag off the home headings', async () => {
    await render(<HomeRoute />);
    expect(screen.queryByTestId('sample-data-updates')).toBeNull();
    expect(screen.queryByTestId('sample-data-affairs')).toBeNull();
  });
});

describe('HomeRoute — durable resume', () => {
  it('shows and opens the signed-in user\'s latest unfinished SQLite attempt', async () => {
    signIn();
    useSessionStore.getState().setUserId('user-1');
    durableMock.findLatest.mockResolvedValueOnce({
      userId: 'user:user-1',
      id: 'local-resume-1',
      testId: 'mock-07',
      startedAt: 1,
      endsAt: Date.now() + 60_000,
      status: 'running',
      currentQuestion: 7,
      currentQuestionId: 'mock-07-q07',
      sectionUnlocked: [true, true, true, false],
      createdAt: 1,
      updatedAt: 2,
    });

    await render(<HomeRoute />);
    const action = await screen.findByTestId('home-continue-action');
    expect(screen.getByTestId('home-continue')).toHaveTextContent(has('Full Mock 07'));
    expect(screen.getByTestId('home-continue')).toHaveTextContent(has(iso('7')));
    await userEvent.press(action);
    expect(mockRouter.push).toHaveBeenCalledWith('/test/mock-07');
  });
});

describe('HomeRoute — links F-24 and F-25 will own', () => {
  it('goes to the updates list, the affairs list and the eligibility checker', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-updates-all'));
    expect(mockRouter.push).toHaveBeenCalledWith('/updates');
    await userEvent.press(screen.getByTestId('home-affairs-more'));
    expect(mockRouter.push).toHaveBeenCalledWith('/affairs');
    await userEvent.press(screen.getByTestId('home-physical-action'));
    expect(mockRouter.push).toHaveBeenCalledWith('/eligibility');
  });

  // A tapped notice opens itself on `/updates`, expanded (review M6). The object form, so
  // expo-router encodes the id rather than having it pasted into a path.
  it('opens the notice that was tapped', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getAllByTestId('home-notice')[0]);
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/updates',
      params: { open: 'nt-2026-pmt-pet' },
    });
  });

  // Free for guests: nothing behind these three links is worth an account.
  it('asks a guest for nothing on the way to any of them', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-physical-action'));
    expect(mockRouter.push).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(auth)/login' }),
    );
  });
});

describe('HomeRoute — the numbers', () => {
  it('reads today’s target off the activity store', async () => {
    for (let i = 0; i < 10; i += 1) useActivityStore.getState().bump('answered');
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-target-count')).toHaveTextContent(
      `${iso('10')} of ${iso('20')} done`,
    );
  });

  it('counts the topics read out of the shelf, and the papers sat', async () => {
    useStudyStore.getState().markRead('st-ar-percentages');
    useStudyStore.getState().markRead('st-re-coding');
    useHistoryStore
      .getState()
      .record({ id: 'res-1', testId: 'mock-07', score: 62.25, maxScore: 100, at: 1 });
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-progress-topics')).toHaveTextContent(
      `${iso('2/11')}Topics read`,
    );
    expect(screen.getByTestId('home-progress-papers')).toHaveTextContent(
      `${iso('1')}Papers practised`,
    );
    // Rounded, and a percentage: a stat tile has room for one number, and the papers do not
    // share a scale, so a raw score would say nothing (review C1).
    expect(screen.getByTestId('home-progress-best')).toHaveTextContent(`${iso('62%')}Best score`);
  });

  it('ranks a perfect drill above a middling full paper', async () => {
    useHistoryStore
      .getState()
      .record({ id: 'res-full', testId: 'mock-07', score: 120, maxScore: 200, at: 1 });
    useHistoryStore
      .getState()
      .record({ id: 'res-drill', testId: 'sec-blood', score: 15, maxScore: 15, at: 2 });
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-progress-best')).toHaveTextContent(
      `${iso('100%')}Best score`,
    );
  });

  it('draws a dash, not a zero, before any paper has been sat', async () => {
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-progress-best')).toHaveTextContent(has(iso('—')));
  });

  it('drops the guest nudge once there is an account to keep the numbers in', async () => {
    signIn();
    await render(<HomeRoute />);
    expect(screen.queryByTestId('home-progress-nudge')).toBeNull();
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(/2345/);
  });
});
