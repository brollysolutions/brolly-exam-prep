import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import PostRoute from '@/app/(onboarding)/post';
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

const choose = async () => {
  await userEvent.press(screen.getByTestId('post-card-si'));
  await userEvent.press(screen.getByTestId('post-continue'));
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockParams = {};
  useSessionStore.getState().logout();
  useSessionStore.getState().setToken('tok-1');
});

describe('PostRoute', () => {
  it('walks the sign-up on to step 2, carrying where the chain ends', async () => {
    mockParams = { returnTo: '/test/mock-07' };
    await render(<PostRoute />);
    await choose();
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/category',
      params: { returnTo: '/test/mock-07' },
    });
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  /**
   * The flag alone is not the question: a session carrying `onboarded` with no category is
   * half-answered, and treating it as an edit would bounce the user straight back out of a
   * sign-up they have not finished.
   */
  it('does not treat a half-answered session as an edit', async () => {
    useSessionStore.getState().completeOnboarding();
    await render(<PostRoute />);
    await choose();
    expect(mockRouter.back).not.toHaveBeenCalled();
    // Nothing asked for the account, so the step stays a plain route.
    expect(mockRouter.push).toHaveBeenCalledWith('/(onboarding)/category');
  });

  it('returns to the caller when both answers were already on file', async () => {
    useSessionStore.getState().setPost('pc');
    useSessionStore.getState().setCategory('bc');
    useSessionStore.getState().completeOnboarding();
    mockParams = { returnTo: '/(tabs)/profile' };
    await render(<PostRoute />);
    await choose();
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('offers a way back only when there is something behind the step', async () => {
    await render(<PostRoute />);
    expect(screen.getByTestId('post-back')).toBeOnTheScreen();
    await userEvent.press(screen.getByTestId('post-back'));
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('hides it on a first run, which begins here', async () => {
    mockCanGoBack = false;
    await render(<PostRoute />);
    expect(screen.queryByTestId('post-back')).toBeNull();
  });
});
