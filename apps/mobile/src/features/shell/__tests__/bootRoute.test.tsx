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

  // F-19: the door is open. A login here would be a wall in front of a free mock test.
  it('opens the app for a guest once the intro has been seen', async () => {
    useSessionStore.getState().markWelcomeSeen();
    await render(<Index />);
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)');
  });

  it('does not stop a signed-in user who never finished onboarding', async () => {
    useSessionStore.getState().markWelcomeSeen();
    useSessionStore.getState().setToken('tok-1');
    await render(<Index />);
    // The missing answers are collected by the action that needs them, not at boot.
    expect(mockRedirect).toHaveBeenCalledWith('/(tabs)');
  });

  it('sends a finished user into the tab shell', async () => {
    useSessionStore.getState().markWelcomeSeen();
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
