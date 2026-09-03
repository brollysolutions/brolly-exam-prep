import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Wall-clock for a screen that shows a date but has no clock on it.
 *
 * `Date.now()` may not be called during render — the reading would change on every
 * re-render for reasons the screen cannot see — so it is read once at mount and again
 * whenever the app comes back to the foreground. That is the only moment a screen with no
 * ticking anything can have gone stale: a phone in a pocket over midnight, and Home coming
 * back with yesterday's countdown and yesterday's target still on it.
 *
 * Use `useCountdown` instead for anything that has to move while it is being watched.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(Date.now());
    });
    return () => subscription.remove();
  }, []);
  return now;
}
