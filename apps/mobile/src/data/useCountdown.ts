import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** The timer box and its toast turn `accent` from here down (spec section 5). */
export const WARN_5_MIN_SEC = 300;
/**
 * Everything turns `danger` from here down: the `HeaderBand`, the timer box, the progress
 * fill and the pinned toast. All static — the marqueeing rail this used to name left the
 * attempt screen in Phase D.
 */
export const WARN_1_MIN_SEC = 60;
/** Away for at least this long earns the resume dialog. */
export const RESUME_AWAY_MS = 2000;

const TICK_MS = 1000;

export type CountdownOptions = {
  /** Epoch ms deadline. Everything is derived from it; nothing decrements. */
  endsAt?: number;
  /** Set false to freeze the clock (attempt submitted, dialog owns the screen). */
  enabled?: boolean;
  onWarn5?: () => void;
  onWarn1?: () => void;
  onExpire?: () => void;
  /** Called on returning to the foreground after `RESUME_AWAY_MS` or more away. */
  onResume?: (awayMs: number) => void;
};

export type Countdown = {
  remainingSec: number;
  /** 5 minutes or less. */
  warning: boolean;
  /** 1 minute or less. */
  critical: boolean;
};

const isAway = (status: AppStateStatus | null | undefined) =>
  status === 'background' || status === 'inactive';

/**
 * Deadline-based countdown. The 1 s interval runs only while the app is foregrounded and
 * only until the deadline is reached; every value is recomputed from `endsAt - Date.now()`,
 * so a backgrounded (or killed) app comes back to the right time instead of a drifted
 * counter.
 *
 * With `enabled: false` the hook is fully inert — no interval and no AppState listener, so
 * a frozen clock (submitted attempt) does not raise a resume dialog when the candidate
 * comes back to read their answers. Flip `enabled` back on and the next reading is exact,
 * because it is derived from `endsAt` rather than accumulated.
 */
export function useCountdown(options: CountdownOptions): Countdown {
  const { endsAt, enabled = true } = options;

  // Callbacks are read through a ref so a screen re-render never restarts the interval.
  // Declared first so the ref is fresh before the ticking effect below runs.
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  const read = useCallback(
    () => (endsAt === undefined ? 0 : Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))),
    [endsAt],
  );

  // The reading is tagged with the deadline it came from, so a new deadline re-derives it
  // during render (React's "adjusting state when a prop changes") instead of in an effect.
  const [reading, setReading] = useState(() => ({ endsAt, sec: read() }));
  if (reading.endsAt !== endsAt) setReading({ endsAt, sec: read() });
  const remainingSec = reading.sec;

  const fired = useRef({ warn5: false, warn1: false, expire: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  // Held in a ref, not an effect-local: a deadline or `enabled` change while the app is
  // backgrounded tears the effect down and rebuilds it, and an effect-local `awayAt` would
  // be lost — the candidate would come back with no resume dialog.
  const awayAtRef = useRef<number | undefined>(undefined);

  // A new deadline re-arms the once-only latches, before the ticking effect can fire them.
  useEffect(() => {
    fired.current = { warn5: false, warn1: false, expire: false };
  }, [endsAt]);

  /**
   * Latches every threshold this reading crosses but announces only the most urgent one.
   * Returning from ten minutes in the background must raise the auto-submit dialog, not a
   * stale "5 minutes left" toast — and must not raise both. No state, so it is safe to
   * call straight from an effect body (a resumed attempt may already be past 5:00).
   */
  const notify = useCallback((sec: number) => {
    const { onWarn5, onWarn1, onExpire } = latest.current;
    const crossed5 = sec <= WARN_5_MIN_SEC && !fired.current.warn5;
    const crossed1 = sec <= WARN_1_MIN_SEC && !fired.current.warn1;
    const crossedEnd = sec <= 0 && !fired.current.expire;

    if (crossed5) fired.current.warn5 = true;
    if (crossed1) fired.current.warn1 = true;
    if (crossedEnd) fired.current.expire = true;

    if (crossedEnd) onExpire?.();
    else if (crossed1) onWarn1?.();
    else if (crossed5) onWarn5?.();
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current !== undefined) clearInterval(intervalRef.current);
    intervalRef.current = undefined;
  }, []);

  /** One reading of the clock: into state (only if it moved), then out to the callbacks. */
  const sample = useCallback(() => {
    if (endsAt === undefined) return;
    const sec = read();
    setReading((prev) => (prev.endsAt === endsAt && prev.sec === sec ? prev : { endsAt, sec }));
    notify(sec);
    // Past the deadline there is nothing left to recompute; stop burning a timer.
    if (sec <= 0) stop();
  }, [endsAt, read, notify, stop]);

  const start = useCallback(() => {
    if (intervalRef.current === undefined) intervalRef.current = setInterval(sample, TICK_MS);
  }, [sample]);

  useEffect(() => {
    if (endsAt === undefined || !enabled) return;

    const initial = read();
    notify(initial);
    if (isAway(AppState.currentState)) awayAtRef.current ??= Date.now();
    else if (initial > 0) start();

    const subscription = AppState.addEventListener('change', (next) => {
      if (isAway(next)) {
        awayAtRef.current ??= Date.now();
        stop();
        return;
      }
      if (next !== 'active') return;
      const awayAt = awayAtRef.current;
      const awayMs = awayAt === undefined ? 0 : Date.now() - awayAt;
      awayAtRef.current = undefined;
      sample();
      if (read() > 0) start();
      if (awayMs >= RESUME_AWAY_MS) latest.current.onResume?.(awayMs);
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [endsAt, enabled, read, notify, sample, start, stop]);

  const armed = endsAt !== undefined;
  return {
    remainingSec: armed ? remainingSec : 0,
    warning: armed && remainingSec <= WARN_5_MIN_SEC,
    critical: armed && remainingSec <= WARN_1_MIN_SEC,
  };
}
