import { renderHook, waitFor } from '@testing-library/react-native';

import type { CachedRead } from '../readCache';
import { useCachedLoad } from '../useCachedLoad';

describe('useCachedLoad', () => {
  it('renders cached data before replacing it with the fresh response', async () => {
    let releaseFresh: (value: string) => void = () => undefined;
    const fresh = new Promise<string>((resolve) => {
      releaseFresh = resolve;
    });
    const load = jest.fn(async (): Promise<CachedRead<string>> => ({ cached: 'cached', fresh }));
    const { result } = await renderHook(() => useCachedLoad('catalog', load));

    await waitFor(() => expect(result.current.data).toBe('cached'));
    expect(result.current).toEqual({
      done: true,
      data: 'cached',
      failed: false,
      refreshing: true,
    });

    releaseFresh('fresh');
    await waitFor(() => expect(result.current.data).toBe('fresh'));
    expect(result.current.refreshing).toBe(false);
  });

  it('keeps valid cached data when the refresh fails', async () => {
    const load = jest.fn(async (): Promise<CachedRead<string>> => ({
      cached: 'cached',
      fresh: Promise.reject(new Error('offline')),
    }));
    const { result } = await renderHook(() => useCachedLoad('catalog', load));

    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current).toEqual({
      done: true,
      data: 'cached',
      failed: false,
      refreshing: false,
    });
  });

  it('reports failure when neither network nor cache can supply data', async () => {
    const load = jest.fn(async (): Promise<CachedRead<string>> => ({
      fresh: Promise.reject(new Error('offline')),
    }));
    const { result } = await renderHook(() => useCachedLoad('catalog', load));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.done).toBe(true);
  });
});
