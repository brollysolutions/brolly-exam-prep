import { useEffect, useState } from 'react';

/** Long enough to read a short sentence, short enough not to sit on the screen. */
export const AUTO_DISMISS_MS = 4000;

/**
 * Shows `value` for `ms`, then drops it — the toast equivalent of a snackbar timeout, so an
 * error banner never outlives the problem it describes.
 *
 * A *new* value restarts the clock; setting the identical value again in the same render pass
 * does not, so clear the source to `null` before re-raising the same message (every caller does,
 * because the request that raises it is asynchronous).
 */
export function useAutoDismiss<T>(value: T | null | undefined, ms: number = AUTO_DISMISS_MS) {
  const [shown, setShown] = useState<T | undefined>(value ?? undefined);
  // "Adjusting state when a prop changes": derive during render, never in an effect.
  const [seen, setSeen] = useState(value);
  if (seen !== value) {
    setSeen(value);
    setShown(value ?? undefined);
  }

  useEffect(() => {
    if (shown === undefined) return;
    const timer = setTimeout(() => setShown(undefined), ms);
    return () => clearTimeout(timer);
  }, [shown, ms]);

  return shown;
}
