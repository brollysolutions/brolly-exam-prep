import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useCallback } from 'react';

import { useLoad } from '../useLoad';

describe('useLoad', () => {
  it('reports the resolved value for the current key', async () => {
    const load = jest.fn(() => Promise.resolve('ok'));
    const { result } = await renderHook(() => useLoad('a', load));
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current).toEqual({ done: true, data: 'ok', failed: false });
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('is done even when the loader resolves undefined', async () => {
    const load = jest.fn(() => Promise.resolve(undefined));
    const { result } = await renderHook(() => useLoad('a', load));
    await waitFor(() => expect(result.current.done).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.failed).toBe(false);
  });

  it('reports a rejection instead of throwing', async () => {
    const load = jest.fn(() => Promise.reject(new Error('nope')));
    const { result } = await renderHook(() => useLoad('a', load));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('drops the old answer while the new key is still in flight', async () => {
    let releaseSecond: (value: string) => void = () => undefined;
    const load = jest.fn((value: string) =>
      value === 'first'
        ? Promise.resolve(value)
        : new Promise<string>((resolve) => {
            releaseSecond = resolve;
          }),
    );
    // Mirrors the routes: the loader is memoised on the same input as the key.
    const { result, rerender } = await renderHook(
      ({ loadKey, value }: { loadKey: string; value: string }) => {
        const fn = useCallback(() => load(value), [value]);
        return useLoad(loadKey, fn);
      },
      { initialProps: { loadKey: 'a', value: 'first' } },
    );
    await waitFor(() => expect(result.current.data).toBe('first'));

    await act(async () => {
      rerender({ loadKey: 'b', value: 'second' });
    });
    expect(result.current.data).toBeUndefined();
    expect(result.current.done).toBe(false);
    expect(result.current.failed).toBe(false);

    await act(async () => {
      releaseSecond('second');
    });
    await waitFor(() => expect(result.current.data).toBe('second'));
    expect(load).toHaveBeenCalledTimes(2);
  });
});
