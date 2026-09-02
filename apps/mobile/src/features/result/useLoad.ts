import { useEffect, useState } from 'react';

export type Load<T> = {
  /** Present once the request for the current key resolved. */
  data?: T;
  /** The request for the current key rejected. */
  failed: boolean;
};

type Settled<T> = { key: string; data?: T; failed?: boolean };

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
  const [settled, setSettled] = useState<Settled<T>>({ key: '' });

  useEffect(() => {
    let live = true;
    load()
      .then((data) => {
        if (live) setSettled({ key, data });
      })
      .catch(() => {
        if (live) setSettled({ key, failed: true });
      });
    return () => {
      live = false;
    };
  }, [key, load]);

  if (settled.key !== key) return { failed: false };
  return { data: settled.data, failed: !!settled.failed };
}
