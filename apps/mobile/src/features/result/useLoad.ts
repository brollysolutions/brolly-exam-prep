import { useEffect, useState } from 'react';

export type Load<T> = {
  /** The request for the current key has settled, one way or the other. */
  done: boolean;
  /** The value, when the request resolved. `undefined` is a legitimate result. */
  data?: T;
  /** The request for the current key rejected. */
  failed: boolean;
};

type Settled<T> = { key: string; data?: T; failed: boolean };

/**
 * One-shot read with a retry key. `key` is the identity of the request (`testId:attempt`),
 * so bumping it re-runs `load` and, because the settled value is tagged with the key it
 * came from, the previous answer stops counting the moment the key changes - no
 * `setState` in the effect body to clear it, which React 19 rightly flags as a cascading
 * render.
 *
 * `load` must be stable (`useCallback`), otherwise every render refetches.
 */
export function useLoad<T>(key: string, load: () => Promise<T>): Load<T> {
  const [settled, setSettled] = useState<Settled<T>>({ key: '', failed: false });

  useEffect(() => {
    let live = true;
    load()
      .then((data) => {
        if (live) setSettled({ key, data, failed: false });
      })
      .catch(() => {
        if (live) setSettled({ key, failed: true });
      });
    return () => {
      live = false;
    };
  }, [key, load]);

  // `done` rather than `data !== undefined`: a loader that legitimately resolves undefined
  // would otherwise pin the caller on its loading state forever.
  if (settled.key !== key) return { done: false, failed: false };
  return { done: true, data: settled.data, failed: settled.failed };
}
