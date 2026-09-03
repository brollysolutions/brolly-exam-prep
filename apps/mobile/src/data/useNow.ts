import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Wall-clock for a screen that shows a date but has no clock on it.
 *
 * `Date.now()` may not be called during render — the reading would change on every
 * re-render for reasons the screen cannot see — so it is read once at mount and again at
 * the two moments a screen with no ticking anything can have gone stale: the app coming
 * back to the foreground (a phone in a pocket over midnight), and the screen coming back
 * into focus (Home stays mounted under `/test/[id]`, and a candidate who works through
 * midnight without ever backgrounding the app returns to it by tab, not by AppState).
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
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );
  return now;
}
