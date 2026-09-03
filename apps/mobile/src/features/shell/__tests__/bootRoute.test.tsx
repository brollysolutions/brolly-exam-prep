import { render } from '@testing-library/react-native';

import Index from '@/app/index';
import { useSessionStore } from '@/data/session';

const mockRedirect = jest.fn();

// `Redirect` renders nothing and just records where it would have gone.
jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirect(String(href));
    return null;
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.setState({
    phone: undefined,
    token: undefined,
    post: undefined,
    category: undefined,
    onboarded: false,
    seenWelcome: false,
    notifications: true,
  });
});

describe('boot router', () => {
  it('opens the intro on a first launch', async () => {
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/(onboarding)/welcome');
  });

  it('skips the intro once it has been seen', async () => {
    useSessionStore.getState().markWelcomeSeen();
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/(auth)/login');
  });

  it('sends a signed-in but un-onboarded user to step 1', async () => {
    useSessionStore.getState().markWelcomeSeen();
    useSessionStore.getState().setToken('tok-1');
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/(onboarding)/post');
  });

  it('sends a finished user into the tab shell', async () => {
    useSessionStore.getState().setToken('tok-1');
    useSessionStore.getState().completeOnboarding();
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)');
  });

  it('keeps the intro dismissed across a logout — it is a property of the handset', () => {
    useSessionStore.getState().markWelcomeSeen();
    useSessionStore.getState().setToken('tok-1');
    useSessionStore.getState().setNotifications(false);
    useSessionStore.getState().logout();
    expect(useSessionStore.getState().seenWelcome).toBe(true);
    expect(useSessionStore.getState().token).toBeUndefined();
    // …and a preference resets with the person: the next user gets the default.
    expect(useSessionStore.getState().notifications).toBe(true);
  });
});
