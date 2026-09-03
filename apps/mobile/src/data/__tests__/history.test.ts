import Storage from 'expo-sqlite/kv-store';

import {
  attemptCount,
  bestAttempt,
  bestScore,
  HISTORY_LIMIT,
  HISTORY_STORAGE_KEY,
  useHistoryStore,
} from '../history';

const read = () => useHistoryStore.getState();

const row = (id: string, score: number, at = 1_700_000_000_000) => ({
  id,
  testId: 'mock-07',
  score,
  maxScore: 100,
  at,
});

beforeEach(() => {
  read().reset();
});

describe('history store', () => {
  it('starts with nothing sat', () => {
    expect(read().attempts).toEqual([]);
    expect(attemptCount(read())).toBe(0);
    // Absent, not zero: a candidate who has sat nothing has no best score, and the tile has
    // to be able to tell those apart.
    expect(bestScore(read())).toBeUndefined();
    expect(bestAttempt(read())).toBeUndefined();
  });

  it('keeps the newest paper first', () => {
    read().record(row('res-1', 40));
    read().record(row('res-2', 55));
    expect(read().attempts.map((a) => a.id)).toEqual(['res-2', 'res-1']);
  });

  // A retried submit is the same paper reaching us twice, not a second attempt.
  it('ignores a result id it already holds', () => {
    read().record(row('res-1', 40));
    read().record(row('res-1', 40));
    expect(attemptCount(read())).toBe(1);
  });

  it('reports the best score whatever order the papers arrived in', () => {
    read().record(row('res-1', 62.25));
    read().record(row('res-2', 41));
    read().record(row('res-3', 58));
    expect(bestScore(read())).toBe(62.25);
    expect(bestAttempt(read())?.id).toBe('res-1');
    expect(attemptCount(read())).toBe(3);
  });

  it('caps the rows it keeps', () => {
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) read().record(row(`res-${i}`, i));
    expect(attemptCount(read())).toBe(HISTORY_LIMIT);
    // The cap drops the oldest, so the best score can be lost — which is the honest cost of
    // a bounded record and still leaves 50 papers of history.
    expect(read().attempts[0].id).toBe(`res-${HISTORY_LIMIT + 4}`);
  });

  it('persists under its own key', () => {
    read().record(row('res-9', 71, 1_700_000_000_001));
    const stored = Storage.getItemSync(HISTORY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state).toEqual({
      attempts: [
        { id: 'res-9', testId: 'mock-07', score: 71, maxScore: 100, at: 1_700_000_000_001 },
      ],
    });
  });
});
