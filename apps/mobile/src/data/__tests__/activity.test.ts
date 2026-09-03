import Storage from 'expo-sqlite/kv-store';

import {
  ACTIVITY_DAYS_KEPT,
  ACTIVITY_STORAGE_KEY,
  DAILY_TARGET,
  dayKey,
  dayTotal,
  streakDays,
  todayProgress,
  useActivityStore,
} from '../activity';

const read = () => useActivityStore.getState();

const DAY = 86_400_000;

/** A fixed afternoon, so "today" never straddles midnight mid-test. */
const NOW = new Date(2026, 8, 3, 15, 30).getTime();

beforeEach(() => {
  read().reset();
});

describe('dayKey', () => {
  it('keys by the local calendar day, not by UTC', () => {
    // 00:30 IST on the 4th is 19:00 UTC on the 3rd. A UTC key would file the small hours of
    // every night under the previous day, which is when half of this app is used.
    expect(dayKey(new Date(2026, 8, 4, 0, 30).getTime())).toBe('2026-09-04');
    expect(dayKey(new Date(2026, 8, 3, 23, 59).getTime())).toBe('2026-09-03');
  });

  it('pads the month and day, so the keys sort as dates', () => {
    expect(dayKey(new Date(2026, 0, 5, 12).getTime())).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 0, 5).getTime()) < dayKey(new Date(2026, 9, 5).getTime())).toBe(
      true,
    );
  });
});

describe('activity store', () => {
  it('starts with nothing done', () => {
    expect(read().byDay).toEqual({});
    expect(todayProgress(read(), DAILY_TARGET, NOW)).toEqual({ done: 0, target: DAILY_TARGET });
  });

  it('counts answers and topics separately, on the day they happened', () => {
    read().bump('answered', NOW);
    read().bump('answered', NOW);
    read().bump('topicsRead', NOW);
    expect(read().byDay['2026-09-03']).toEqual({ answered: 2, topicsRead: 1 });
  });

  it('opens a fresh day rather than adding to yesterday', () => {
    read().bump('answered', NOW - DAY);
    read().bump('answered', NOW);
    expect(read().byDay['2026-09-02']).toEqual({ answered: 1, topicsRead: 0 });
    expect(read().byDay['2026-09-03']).toEqual({ answered: 1, topicsRead: 0 });
  });

  // The record is rewritten to storage on every answer, so it may not grow without end.
  it('drops days older than the window it keeps', () => {
    read().bump('answered', NOW - (ACTIVITY_DAYS_KEPT + 2) * DAY);
    expect(Object.keys(read().byDay)).toHaveLength(1);
    read().bump('answered', NOW);
    expect(Object.keys(read().byDay)).toEqual(['2026-09-03']);
  });

  // "90 days kept" means today and the 89 before it — not 91 (review M2).
  it('keeps exactly the advertised number of days, today included', () => {
    read().bump('answered', NOW - ACTIVITY_DAYS_KEPT * DAY);
    read().bump('answered', NOW - (ACTIVITY_DAYS_KEPT - 1) * DAY);
    read().bump('answered', NOW);
    const kept = Object.keys(read().byDay).sort();
    expect(kept).toEqual([dayKey(NOW - (ACTIVITY_DAYS_KEPT - 1) * DAY), '2026-09-03']);
  });

  it('persists the record under its own key', () => {
    read().bump('topicsRead', NOW);
    const stored = Storage.getItemSync(ACTIVITY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state).toEqual({
      byDay: { '2026-09-03': { answered: 0, topicsRead: 1 } },
    });
  });
});

describe('todayProgress', () => {
  it('adds answers and topics into one day of work', () => {
    read().bump('answered', NOW);
    read().bump('topicsRead', NOW);
    expect(todayProgress(read(), 20, NOW)).toEqual({ done: 2, target: 20 });
  });

  it('reports more than the target rather than capping it', () => {
    for (let i = 0; i < 22; i += 1) read().bump('answered', NOW);
    expect(todayProgress(read(), 20, NOW).done).toBe(22);
  });

  it('ignores yesterday', () => {
    read().bump('answered', NOW - DAY);
    expect(todayProgress(read(), 20, NOW).done).toBe(0);
    expect(dayTotal(read(), '2026-09-02')).toBe(1);
  });
});

describe('streakDays', () => {
  it('is zero with nothing done', () => {
    expect(streakDays(read(), NOW)).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    for (const back of [0, 1, 2]) read().bump('answered', NOW - back * DAY);
    expect(streakDays(read(), NOW)).toBe(3);
  });

  // The day is still running: a streak is not broken until it ends, so the number a candidate
  // sees at breakfast is the one they went to bed with.
  it('does not break a streak just because today has not started yet', () => {
    for (const back of [1, 2, 3]) read().bump('answered', NOW - back * DAY);
    expect(streakDays(read(), NOW)).toBe(3);
  });

  it('stops at the first missed day', () => {
    for (const back of [0, 1, 3, 4]) read().bump('topicsRead', NOW - back * DAY);
    expect(streakDays(read(), NOW)).toBe(2);
  });
});
