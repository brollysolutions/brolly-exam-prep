import { render, screen, userEvent } from '@testing-library/react-native';
import { initI18n } from '@tslprb/i18n';

import HomeRoute from '@/app/(tabs)/index';
import { useSessionStore } from '@/data/session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

/** Everything answered: the state in which nothing should be asked for again. */
const signIn = () => {
  useSessionStore.getState().setToken('tok-1');
  useSessionStore.getState().setPhone('9000012345');
  useSessionStore.getState().setPost('si');
  useSessionStore.getState().setCategory('bc');
  useSessionStore.getState().completeOnboarding();
};

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.getState().logout();
});

describe('HomeRoute (guest)', () => {
  it('renders the dashboard with no account at all', async () => {
    await render(<HomeRoute />);
    expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('home-greeting')).toHaveTextContent('Ready?');
    expect(screen.getByTestId('home-signin')).toBeOnTheScreen();
  });

  it('asks for a sign-in only when the mock is started, and comes back to it', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-start'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('sends the header link back to the dashboard it was pressed on', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-signin'));
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/(tabs)' },
    });
  });

  // The shelf is readable by anyone; the paper picked off it is what asks for an account.
  it('lets a weak-topic row through to the shelf without asking for anything', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-topic-drill-blood'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/(tabs)/tests');
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});

describe('HomeRoute (signed in)', () => {
  beforeEach(signIn);

  it('drops the header link and greets the number', async () => {
    await render(<HomeRoute />);
    expect(screen.queryByTestId('home-signin')).toBeNull();
    expect(screen.getByTestId('home-greeting')).toHaveTextContent(/2345/);
  });

  // The card pitches mock-07, so the button must open mock-07 and not an id typed twice.
  it('opens the paper the card is pitching', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-start'));
    expect(mockRouter.push).toHaveBeenCalledWith('/test/mock-07');
  });

  it('re-enters the Tests tab rather than stacking another copy of it', async () => {
    await render(<HomeRoute />);
    await userEvent.press(screen.getByTestId('home-topic-drill-blood'));
    expect(mockRouter.navigate).toHaveBeenCalledWith('/(tabs)/tests');
  });
});
