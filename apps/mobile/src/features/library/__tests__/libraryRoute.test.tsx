import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import LibraryRoute from '@/app/(tabs)/tests';
import { useSessionStore } from '@/data/session';

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
  useSessionStore.getState().logout();
});

describe('LibraryRoute', () => {
  it('lists the papers for a guest', async () => {
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
  });

  it('asks for a sign-in when a free paper is opened, and remembers which one', async () => {
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-07'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  // A paywall is not a reason to make someone sign in: the toast is the whole answer.
  it('leaves a locked paper to its toast and asks for nothing', async () => {
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-08'));
    expect(screen.getByTestId('library-locked-toast')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  // F-21 sends a reader here with `?kind=sectional`; the shelf has to follow the link.
  it('opens on the sectional shelf when the link asks for it', async () => {
    mockParams = { kind: 'sectional' };
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-sec-seating')).toBeOnTheScreen();
    expect(screen.queryByTestId('library-row-mock-07')).toBeNull();
  });

  it('ignores a kind it does not know', async () => {
    mockParams = { kind: 'nonsense' };
    await render(<LibraryRoute />);
    expect(screen.getByTestId('library-row-mock-07')).toBeOnTheScreen();
  });

  it('opens the paper directly once the account is in place', async () => {
    useSessionStore.getState().setToken('tok-1');
    useSessionStore.getState().setPost('pc');
    useSessionStore.getState().setCategory('oc');
    useSessionStore.getState().completeOnboarding();
    await render(<LibraryRoute />);
    await userEvent.press(screen.getByTestId('library-row-mock-07'));
    expect(mockRouter.push).toHaveBeenCalledWith('/test/mock-07');
  });
});
