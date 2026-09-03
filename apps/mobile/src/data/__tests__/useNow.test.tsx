import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useNow } from '../useNow';

const T0 = Date.parse('2026-09-03T18:00:00.000Z');

let handler: ((status: AppStateStatus) => void) | undefined;

/** The focus callback the hook registers, kept so a test can re-focus the screen. */
let mockFocus: (() => void) | undefined;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    mockFocus = effect;
    // Fetched here rather than imported: `jest.mock` is hoisted above the imports.
    jest.requireActual<typeof import('react')>('react').useEffect(effect, [effect]);
  },
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  handler = undefined;
  mockFocus = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    handler = listener as (status: AppStateStatus) => void;
    return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const appStateChange = async (status: AppStateStatus) => {
  await act(async () => {
    handler?.(status);
  });
};

describe('useNow', () => {
  it('reads the clock once, at mount', async () => {
    const { result, rerender } = await renderHook(() => useNow());
    expect(result.current).toBe(T0);
    jest.setSystemTime(T0 + 60_000);
    await rerender(undefined);
    // A re-render for any other reason must not move the reading, or nothing derived from it
    // is stable.
    expect(result.current).toBe(T0);
  });

  // A phone in a pocket over midnight is the only way a screen with no clock goes stale.
  it('re-reads on the way back from the background', async () => {
    const { result } = await renderHook(() => useNow());
    jest.setSystemTime(T0 + 8 * 3_600_000);
    await appStateChange('active');
    expect(result.current).toBe(T0 + 8 * 3_600_000);
  });

  // Home stays mounted under `/test/[id]`: a candidate who works through midnight without
  // backgrounding the app comes back to it by tab, not by AppState (review M3).
  it('re-reads when the screen comes back into focus', async () => {
    const { result } = await renderHook(() => useNow());
    jest.setSystemTime(T0 + 8 * 3_600_000);
    await act(async () => {
      mockFocus?.();
    });
    expect(result.current).toBe(T0 + 8 * 3_600_000);
  });

  it('ignores going away, which changes nothing on screen', async () => {
    const { result } = await renderHook(() => useNow());
    jest.setSystemTime(T0 + 60_000);
    await appStateChange('background');
    expect(result.current).toBe(T0);
  });
});
