import { act, renderHook } from '@testing-library/react-native';

import { AUTO_DISMISS_MS, useAutoDismiss } from '../useAutoDismiss';

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useAutoDismiss', () => {
  it('shows a value and drops it after the timeout', async () => {
    const { result } = await renderHook(() => useAutoDismiss('No connection.'));
    expect(result.current).toBe('No connection.');
    await advance(AUTO_DISMISS_MS - 1);
    expect(result.current).toBe('No connection.');
    await advance(1);
    expect(result.current).toBeUndefined();
  });

  it('honours a custom duration', async () => {
    const { result } = await renderHook(() => useAutoDismiss('Boom', 1000));
    await advance(1000);
    expect(result.current).toBeUndefined();
  });

  it('stays undefined while there is nothing to show', async () => {
    const { result } = await renderHook(() => useAutoDismiss<string>(null));
    expect(result.current).toBeUndefined();
    await advance(AUTO_DISMISS_MS);
    expect(result.current).toBeUndefined();
  });

  it('restarts the clock for a new value', async () => {
    const { result, rerender } = await renderHook<
      string | undefined,
      { v: string | null }
    >(({ v }) => useAutoDismiss(v), { initialProps: { v: 'first' } });
    await advance(AUTO_DISMISS_MS - 500);
    await act(async () => {
      rerender({ v: 'second' });
    });
    await advance(AUTO_DISMISS_MS - 500);
    expect(result.current).toBe('second');
    await advance(500);
    expect(result.current).toBeUndefined();
  });

  it('shows the same message again once the source has been cleared', async () => {
    const { result, rerender } = await renderHook<
      string | undefined,
      { v: string | null }
    >(({ v }) => useAutoDismiss(v), { initialProps: { v: 'same' } });
    await advance(AUTO_DISMISS_MS);
    expect(result.current).toBeUndefined();
    await act(async () => {
      rerender({ v: null });
    });
    await act(async () => {
      rerender({ v: 'same' });
    });
    expect(result.current).toBe('same');
  });
});
