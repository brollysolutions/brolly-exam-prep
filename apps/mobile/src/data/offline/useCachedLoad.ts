import { useEffect, useState } from 'react';

import type { CachedRead } from './readCache';

export type CachedLoad<T> = {
  done: boolean;
  data?: T;
  failed: boolean;
  refreshing: boolean;
};

type Settled<T> = Omit<CachedLoad<T>, 'done'> & { key: string; done: boolean };

/** Cache-first screen read followed by a network refresh for the same stable key. */
export function useCachedLoad<T>(
  key: string,
  load: () => Promise<CachedRead<T>>,
): CachedLoad<T> {
  const [settled, setSettled] = useState<Settled<T>>({
    key: '',
    done: false,
    failed: false,
    refreshing: false,
  });

  useEffect(() => {
    let live = true;
    void load()
      .then(async (read) => {
        const hasCache = read.cached !== undefined;
        if (live && hasCache) {
          setSettled({
            key,
            done: true,
            data: read.cached,
            failed: false,
            refreshing: true,
          });
        }
        try {
          const fresh = await read.fresh;
          if (live) {
            setSettled({ key, done: true, data: fresh, failed: false, refreshing: false });
          }
        } catch {
          if (live && !hasCache) {
            setSettled({ key, done: true, failed: true, refreshing: false });
          } else if (live) {
            setSettled((current) => ({ ...current, refreshing: false }));
          }
        }
      })
      .catch(() => {
        if (live) setSettled({ key, done: true, failed: true, refreshing: false });
      });
    return () => {
      live = false;
    };
  }, [key, load]);

  if (settled.key !== key) {
    return { done: false, failed: false, refreshing: false };
  }
  return {
    done: settled.done,
    data: settled.data,
    failed: settled.failed,
    refreshing: settled.refreshing,
  };
}
