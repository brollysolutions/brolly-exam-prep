import { act, renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { useCountdown } from '../useCountdown';

const T0 = Date.parse('2026-09-02T10:00:00.000Z');
const TEN_MINUTES = 600_000;

let appStateHandler: ((status: AppStateStatus) => void) | undefined;

const callbacks = () => ({
  onWarn5: jest.fn(),
  onWarn1: jest.fn(),
  onExpire: jest.fn(),
  onResume: jest.fn(),
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(T0);
  appStateHandler = undefined;
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    appStateHandler = listener as (status: AppStateStatus) => void;
    return { remove: jest.fn() } as ReturnType<typeof AppState.addEventListener>;
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const advance = async (ms: number) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};
const appStateChange = async (status: AppStateStatus) => {
  await act(async () => {
    appStateHandler?.(status);
  });
};

describe('useCountdown', () => {
  it('reports the seconds left from the deadline', async () => {
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES }));
    expect(result.current).toEqual({ remainingSec: 600, warning: false, critical: false });
  });

  it('ticks once a second while the app is active', async () => {
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES }));
    await advance(1000);
    expect(result.current.remainingSec).toBe(599);
    await advance(4000);
    expect(result.current.remainingSec).toBe(595);
  });

  it('fires onWarn5 exactly once at 300 s and flips warning', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await advance(299_000);
    expect(result.current.remainingSec).toBe(301);
    expect(cb.onWarn5).not.toHaveBeenCalled();
    expect(result.current.warning).toBe(false);

    await advance(1000);
    expect(result.current.remainingSec).toBe(300);
    expect(result.current.warning).toBe(true);
    expect(result.current.critical).toBe(false);
    expect(cb.onWarn5).toHaveBeenCalledTimes(1);

    await advance(5000);
    expect(cb.onWarn5).toHaveBeenCalledTimes(1);
  });

  it('fires onWarn1 exactly once at 60 s and flips critical', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await advance(539_000);
    expect(result.current.remainingSec).toBe(61);
    expect(cb.onWarn1).not.toHaveBeenCalled();

    await advance(1000);
    expect(result.current.remainingSec).toBe(60);
    expect(result.current.critical).toBe(true);
    expect(cb.onWarn1).toHaveBeenCalledTimes(1);

    await advance(10_000);
    expect(cb.onWarn1).toHaveBeenCalledTimes(1);
  });

  it('fires onExpire exactly once at zero and stops at zero', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await advance(TEN_MINUTES - 1000);
    expect(cb.onExpire).not.toHaveBeenCalled();

    await advance(1000);
    expect(result.current.remainingSec).toBe(0);
    expect(cb.onExpire).toHaveBeenCalledTimes(1);

    await advance(30_000);
    expect(result.current.remainingSec).toBe(0);
    expect(cb.onExpire).toHaveBeenCalledTimes(1);
  });

  it('announces only the most urgent threshold when several are crossed at once', async () => {
    const cb = callbacks();
    await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('background');
    await advance(TEN_MINUTES + 5000);
    await appStateChange('active');

    // back from ten minutes away: the auto-submit dialog, not a stale "5 minutes left" toast
    expect(cb.onExpire).toHaveBeenCalledTimes(1);
    expect(cb.onWarn5).not.toHaveBeenCalled();
    expect(cb.onWarn1).not.toHaveBeenCalled();
  });

  it('fires only onWarn1 when returning from background under a minute', async () => {
    const cb = callbacks();
    await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('background');
    await advance(TEN_MINUTES - 45_000);
    await appStateChange('active');

    expect(cb.onWarn1).toHaveBeenCalledTimes(1);
    expect(cb.onWarn5).not.toHaveBeenCalled();
    expect(cb.onExpire).not.toHaveBeenCalled();
  });

  it('latches the skipped threshold so it cannot fire later', async () => {
    const cb = callbacks();
    await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('background');
    await advance(TEN_MINUTES - 45_000);
    await appStateChange('active');
    await advance(20_000); // ticks on through 40, 30, 25 s

    expect(cb.onWarn5).not.toHaveBeenCalled();
    expect(cb.onWarn1).toHaveBeenCalledTimes(1);
  });

  it('clears the interval and stops updating once expired', async () => {
    const cb = callbacks();
    let renders = 0;
    const { result } = await renderHook(() => {
      renders += 1;
      return useCountdown({ endsAt: T0 + 5000, ...cb });
    });

    // jest's own count includes the renderer's scheduler timers, so compare, don't assume 0
    const timersWhileTicking = jest.getTimerCount();

    await advance(5000);
    expect(result.current.remainingSec).toBe(0);
    expect(cb.onExpire).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBeLessThan(timersWhileTicking);

    const rendersAtExpiry = renders;
    await advance(60_000);
    expect(renders).toBe(rendersAtExpiry);
    expect(result.current.remainingSec).toBe(0);
  });

  it('does not re-render on a tick that lands on the same second', async () => {
    let renders = 0;
    await renderHook(() => {
      renders += 1;
      return useCountdown({ endsAt: T0 + TEN_MINUTES });
    });
    const before = renders;
    await advance(500); // half a tick: no interval fires, no update
    expect(renders).toBe(before);
  });

  it('still reports the time away when the deadline changes while backgrounded', async () => {
    const cb = callbacks();
    const { rerender } = await renderHook(
      ({ endsAt }: { endsAt: number }) => useCountdown({ endsAt, ...cb }),
      { initialProps: { endsAt: T0 + TEN_MINUTES } },
    );

    await appStateChange('background');
    await advance(5000);
    // a server-issued deadline arrives while the app is in the background
    await rerender({ endsAt: T0 + TEN_MINUTES + 30_000 });
    await appStateChange('active');

    expect(cb.onResume).toHaveBeenCalledTimes(1);
    expect(cb.onResume).toHaveBeenCalledWith(5000);
  });

  it('stops ticking while backgrounded and recomputes on return', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('background');
    await advance(30_000);
    expect(result.current.remainingSec).toBe(600);

    await appStateChange('active');
    expect(result.current.remainingSec).toBe(570);
  });

  it('calls onResume with the time away after 2 s or more in the background', async () => {
    const cb = callbacks();
    await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('background');
    await advance(5000);
    await appStateChange('active');

    expect(cb.onResume).toHaveBeenCalledTimes(1);
    expect(cb.onResume).toHaveBeenCalledWith(5000);
  });

  it('does not call onResume for a brief blip under 2 s', async () => {
    const cb = callbacks();
    await renderHook(() => useCountdown({ endsAt: T0 + TEN_MINUTES, ...cb }));

    await appStateChange('inactive');
    await advance(1500);
    await appStateChange('active');

    expect(cb.onResume).not.toHaveBeenCalled();
  });

  it('does nothing without a deadline', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() => useCountdown({ ...cb }));
    await advance(TEN_MINUTES);
    expect(result.current.remainingSec).toBe(0);
    expect(cb.onWarn5).not.toHaveBeenCalled();
    expect(cb.onWarn1).not.toHaveBeenCalled();
    expect(cb.onExpire).not.toHaveBeenCalled();
  });

  it('does not tick while disabled', async () => {
    const cb = callbacks();
    const { result } = await renderHook(() =>
      useCountdown({ endsAt: T0 + TEN_MINUTES, enabled: false, ...cb }),
    );
    await advance(TEN_MINUTES);
    expect(result.current.remainingSec).toBe(600);
    expect(cb.onExpire).not.toHaveBeenCalled();
  });

  it('re-arms its once-only latches when a new deadline is set', async () => {
    const cb = callbacks();
    const { result, rerender } = await renderHook(
      ({ endsAt }: { endsAt: number }) => useCountdown({ endsAt, ...cb }),
      { initialProps: { endsAt: T0 + 60_000 } },
    );
    await advance(60_000);
    expect(cb.onExpire).toHaveBeenCalledTimes(1);

    await rerender({ endsAt: Date.now() + TEN_MINUTES });
    expect(result.current.remainingSec).toBe(600);
    await advance(TEN_MINUTES);
    expect(cb.onExpire).toHaveBeenCalledTimes(2);
  });
});
