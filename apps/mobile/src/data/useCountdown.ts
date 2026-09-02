import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Toast + rail turn hazard from here down (spec section 5). */
export const WARN_5_MIN_SEC = 300;
/** Toast + rail turn flag and marquee from here down. */
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
 * Deadline-based countdown. The 1 s interval runs only while the app is foregrounded; every
 * value is recomputed from `endsAt - Date.now()`, so a backgrounded (or killed) app comes
 * back to the right time instead of a drifted counter.
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

  // A new deadline re-arms the once-only latches, before the ticking effect can fire them.
  useEffect(() => {
    fired.current = { warn5: false, warn1: false, expire: false };
  }, [endsAt]);

  /** Fires each threshold callback at most once per deadline. No state, so it is safe
   * to call straight from an effect body (a resumed attempt may already be past 5:00). */
  const notify = useCallback((sec: number) => {
    const { onWarn5, onWarn1, onExpire } = latest.current;
    if (sec <= WARN_5_MIN_SEC && !fired.current.warn5) {
      fired.current.warn5 = true;
      onWarn5?.();
    }
    if (sec <= WARN_1_MIN_SEC && !fired.current.warn1) {
      fired.current.warn1 = true;
      onWarn1?.();
    }
    if (sec <= 0 && !fired.current.expire) {
      fired.current.expire = true;
      onExpire?.();
    }
  }, []);

  /** One reading of the clock: into state, then out to the threshold callbacks. */
  const sample = useCallback(() => {
    if (endsAt === undefined) return;
    const sec = read();
    setReading({ endsAt, sec });
    notify(sec);
  }, [endsAt, read, notify]);

  useEffect(() => {
    if (endsAt === undefined || !enabled) return;

    let interval: ReturnType<typeof setInterval> | undefined;
    let awayAt: number | undefined;

    const start = () => {
      if (interval === undefined) interval = setInterval(sample, TICK_MS);
    };
    const stop = () => {
      if (interval !== undefined) clearInterval(interval);
      interval = undefined;
    };

    notify(read());
    if (isAway(AppState.currentState)) awayAt = Date.now();
    else start();

    const subscription = AppState.addEventListener('change', (next) => {
      if (isAway(next)) {
        if (awayAt === undefined) awayAt = Date.now();
        stop();
        return;
      }
      if (next !== 'active') return;
      const awayMs = awayAt === undefined ? 0 : Date.now() - awayAt;
      awayAt = undefined;
      sample();
      start();
      if (awayMs >= RESUME_AWAY_MS) latest.current.onResume?.(awayMs);
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, [endsAt, enabled, read, notify, sample]);

  const armed = endsAt !== undefined;
  return {
    remainingSec: armed ? remainingSec : 0,
    warning: armed && remainingSec <= WARN_5_MIN_SEC,
    critical: armed && remainingSec <= WARN_1_MIN_SEC,
  };
}
