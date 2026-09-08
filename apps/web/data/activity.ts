import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

/** The two things a candidate can do that count towards a day's work. */
export type ActivityKind = 'answered' | 'topicsRead';

export type DayCounts = { answered: number; topicsRead: number };

/**
 * What was done, per calendar day.
 *
 * Keyed by a local `YYYY-MM-DD` string rather than a timestamp: "today" is a calendar
 * question, and the only reads are "today's total" and "how many days in a row", both of
 * which are lookups on that key. Days are counted, never listed, so the record never needs
 * to be ordered.
 */
export type ActivityState = { byDay: Record<string, DayCounts> };

export type ActivityActions = {
  /**
   * Record one unit of work. Called from the ROUTE layer (the attempt screen's answer
   * handler, the topic screen's mark-read), never from another store: a store that imports
   * a store is a cycle waiting for the next feature to close it.
   */
  bump: (kind: ActivityKind, now?: number) => void;
  /** Clear the record. Called by `signOut()`, and by the tests. */
  reset: () => void;
};

export type ActivityStore = ActivityState & ActivityActions;

export const ACTIVITY_STORAGE_KEY = 'tslprb.activity';

/** Questions-or-topics a day's work is measured against. */
export const DAILY_TARGET = 20;

/**
 * Days kept. A streak longer than this is not a number anyone reads, and the record is
 * rewritten to storage on every answer — an unbounded map would grow into that write.
 */
export const ACTIVITY_DAYS_KEPT = 90;

const DAY_MS = 86_400_000;

const EMPTY: DayCounts = { answered: 0, topicsRead: 0 };

/**
 * `YYYY-MM-DD` in the handset's own timezone.
 *
 * Deliberately NOT `toISOString().slice(0, 10)`: that is UTC, so everything a candidate in
 * IST does after 5:30 am would land on the previous day's key.
 */
export function dayKey(now: number = Date.now()): string {
  const d = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Everything but the last `ACTIVITY_DAYS_KEPT` days dropped, so the persisted record stays
 * bounded. The window is inclusive of today: 90 kept is today and the 89 before it.
 */
function prune(byDay: Record<string, DayCounts>, now: number): Record<string, DayCounts> {
  const oldest = dayKey(now - (ACTIVITY_DAYS_KEPT - 1) * DAY_MS);
  // String comparison is a date comparison for `YYYY-MM-DD`, which is why the key is padded.
  const kept = Object.entries(byDay).filter(([key]) => key >= oldest);
  return kept.length === Object.keys(byDay).length ? byDay : Object.fromEntries(kept);
}

/**
 * F-23 — what was done today, and how many days in a row. Cleared by `signOut()`: a streak
 * is a record of one person's practice, Home shows it to whoever opens the app, and these
 * handsets are shared. The language stays; a practice record does not.
 */
export const useActivityStore = create<ActivityStore>()(
  persist(
    (set) => ({
      byDay: {},
      bump: (kind, now = Date.now()) =>
        set((s) => {
          const key = dayKey(now);
          const current = s.byDay[key] ?? EMPTY;
          return {
            byDay: prune({ ...s.byDay, [key]: { ...current, [kind]: current[kind] + 1 } }, now),
          };
        }),
      reset: () => set({ byDay: {} }),
    }),
    {
      name: ACTIVITY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): ActivityState => ({ byDay: s.byDay }),
    },
  ),
);

/** Everything done on one day. Missing days read as zero rather than as a gap. */
export const dayCounts = (state: ActivityState, key: string): DayCounts =>
  state.byDay[key] ?? EMPTY;

/** Questions answered plus topics read on one day. */
export const dayTotal = (state: ActivityState, key: string): number => {
  const day = dayCounts(state, key);
  return day.answered + day.topicsRead;
};

/**
 * Today's work against the day's target. `done` is NOT clamped — "22 of 20" is a true
 * sentence and a better one than "20 of 20" — so the bar that draws it clamps instead.
 */
export function todayProgress(
  state: ActivityState,
  target: number = DAILY_TARGET,
  now: number = Date.now(),
): { done: number; target: number } {
  return { done: dayTotal(state, dayKey(now)), target };
}

/**
 * Consecutive days ending today with anything done on them.
 *
 * A day with no work yet does not break the streak while it is still running: the walk
 * starts at yesterday when today is empty, so the number a candidate sees in the morning is
 * the one they went to bed with.
 *
 * Stepping by 86 400 000 ms is exact in IST, which has no DST; a locale that does could
 * see a one-day drift twice a year, which is not worth a calendar library here.
 */
export function streakDays(state: ActivityState, now: number = Date.now()): number {
  let cursor = dayTotal(state, dayKey(now)) > 0 ? now : now - DAY_MS;
  let days = 0;
  while (dayTotal(state, dayKey(cursor)) > 0) {
    days += 1;
    cursor -= DAY_MS;
  }
  return days;
}
