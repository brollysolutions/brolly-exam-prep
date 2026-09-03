import { renderHook } from '@testing-library/react-native';

import { gateHref, useRequireAuth } from '../requireAuth';
import { useSessionStore } from '../session';

const mockRouter = { push: jest.fn(), replace: jest.fn(), navigate: jest.fn(), back: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

/** The three states the gate tells apart, in the order a new user passes through them. */
const guest = () => useSessionStore.getState().logout();
const halfWay = () => {
  guest();
  useSessionStore.getState().setToken('tok-1');
};
const ready = () => {
  halfWay();
  useSessionStore.getState().setPost('si');
  useSessionStore.getState().setCategory('bc');
  useSessionStore.getState().completeOnboarding();
};

beforeEach(() => {
  jest.clearAllMocks();
  guest();
});

describe('gateHref', () => {
  it('asks for a phone number first, carrying the target', () => {
    expect(gateHref('/test/mock-07', { signedIn: false, onboarded: false })).toEqual({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('asks for the missing answers next, carrying the same target', () => {
    expect(gateHref('/test/mock-07', { signedIn: true, onboarded: false })).toEqual({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('gets out of the way once there is nothing left to ask', () => {
    expect(gateHref('/test/mock-07', { signedIn: true, onboarded: true })).toBe('/test/mock-07');
  });
});

describe('useRequireAuth', () => {
  it('sends a guest to the sign-in and remembers what they wanted', async () => {
    const { result } = await renderHook(() => useRequireAuth());
    expect(result.current.signedIn).toBe(false);
    result.current.ensure('/test/mock-07');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(auth)/login',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('sends a signed-in user with no answers to step 1', async () => {
    halfWay();
    const { result } = await renderHook(() => useRequireAuth());
    expect(result.current.signedIn).toBe(true);
    expect(result.current.onboarded).toBe(false);
    result.current.ensure('/test/mock-07');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
  });

  it('lets a finished user straight through', async () => {
    ready();
    const { result } = await renderHook(() => useRequireAuth());
    expect(result.current.onboarded).toBe(true);
    result.current.ensure('/test/mock-07');
    expect(mockRouter.push).toHaveBeenCalledWith('/test/mock-07');
  });

  // The flag alone would let a half-answered sign-up count as finished (see `isOnboarded`).
  it('does not call a user onboarded while an answer is missing', async () => {
    halfWay();
    useSessionStore.getState().completeOnboarding();
    const { result } = await renderHook(() => useRequireAuth());
    expect(result.current.onboarded).toBe(false);
    result.current.ensure('/test/mock-07');
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/(onboarding)/post',
      params: { returnTo: '/test/mock-07' },
    });
  });
});
