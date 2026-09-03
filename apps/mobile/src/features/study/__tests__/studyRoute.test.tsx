import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import StudyRoute from '@/app/(tabs)/study';
import StudyTopicRoute from '@/app/study/[topic]';
import { useSessionStore } from '@/data/session';
import { useStudyStore } from '@/data/study';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };
let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
}));

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockParams = {};
  jest.clearAllMocks();
  useStudyStore.getState().reset();
  useSessionStore.getState().logout();
});

describe('StudyRoute', () => {
  // Reading is what brings someone back to the app; an account buys a saved attempt, not the
  // syllabus. So there is no gate anywhere on this tab.
  it('opens a topic for a guest without asking for an account', async () => {
    await render(<StudyRoute />);
    await userEvent.press(screen.getByTestId('study-row-st-ar-percentages'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/study/[topic]',
      params: { topic: 'st-ar-percentages' },
    });
  });

  it('ticks the topics the store already holds', async () => {
    useStudyStore.getState().markRead('st-ar-percentages');
    await render(<StudyRoute />);
    expect(screen.getByTestId('study-read-st-ar-percentages')).toBeOnTheScreen();
  });
});

describe('StudyTopicRoute', () => {
  it('reads the topic named in the route and marks it read in the store', async () => {
    mockParams = { topic: 'st-re-blood' };
    await render(<StudyTopicRoute />);
    expect(screen.getByText('Blood relations')).toBeOnTheScreen();

    await userEvent.press(screen.getByTestId('topic-mark-read'));
    expect(useStudyStore.getState().isRead('st-re-blood')).toBe(true);
  });

  it('sends the reader to the sectional shelf, ungated', async () => {
    mockParams = { topic: 'st-re-blood' };
    await render(<StudyTopicRoute />);
    await userEvent.press(screen.getByTestId('topic-practise'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/(tabs)/tests?kind=sectional');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('shows the not-found state for an id the shelf does not hold', async () => {
    mockParams = { topic: 'st-nope' };
    await render(<StudyTopicRoute />);
    expect(screen.getByTestId('topic-not-found')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('topic-not-found-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
