import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

/**
 * One finished paper, as the handset remembers it.
 *
 * `score`/`maxScore` rather than a percentage: papers differ in length, so the ratio has to
 * stay divisible at the point it is read. `id` is the result id, which is what makes a
 * re-submit idempotent — the same paper submitted twice is one row, not two.
 */
export type AttemptRecord = {
  id: string;
  testId: string;
  score: number;
  maxScore: number;
  /** Epoch ms the result came back. */
  at: number;
};

export type HistoryState = { attempts: AttemptRecord[] };

export type HistoryActions = {
  /** Written by the attempt route once the server has scored the paper. */
  record: (attempt: AttemptRecord) => void;
  /** Clear the record. Used by tests; there is no product action that erases a result. */
  reset: () => void;
};

export type HistoryStore = HistoryState & HistoryActions;

export const HISTORY_STORAGE_KEY = 'tslprb.history';

/** Rows kept, newest first. Home reads a count and a maximum; nothing pages through them. */
export const HISTORY_LIMIT = 50;

/**
 * F-23 — the papers this handset has sat. Kept locally and NOT cleared by `signOut()`:
 * the numbers on Home are a record of practice, not of an account, and the server keeps
 * its own copy for the account anyway.
 */
export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      attempts: [],
      record: (attempt) =>
        set((s) => {
          // A result id already held is the same paper reaching us twice (a retried submit).
          if (s.attempts.some((a) => a.id === attempt.id)) return s;
          return { attempts: [attempt, ...s.attempts].slice(0, HISTORY_LIMIT) };
        }),
      reset: () => set({ attempts: [] }),
    }),
    {
      name: HISTORY_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): HistoryState => ({ attempts: s.attempts }),
    },
  ),
);

/** Papers sat. */
export const attemptCount = (state: HistoryState): number => state.attempts.length;

/**
 * A paper's score as a share of its marks, 0..1. A paper with no marks on offer is a zero
 * rather than a division by nothing.
 */
const ratio = (a: AttemptRecord): number => (a.maxScore > 0 ? a.score / a.maxScore : 0);

/**
 * The paper the best result was scored on — best by SHARE of the marks, never by raw marks:
 * the papers a candidate can sit are out of 200, 40, 20 or 15, so 15/15 on a drill has to
 * beat 120/200 on the full paper, and 40/40 on the short mock has to beat 30/200.
 * `undefined` when nothing has been sat, which is a different thing from zero.
 */
export function bestAttempt(state: HistoryState): AttemptRecord | undefined {
  return state.attempts.reduce<AttemptRecord | undefined>(
    (best, a) => (best === undefined || ratio(a) > ratio(best) ? a : best),
    undefined,
  );
}

/** The best result as a percentage (0–100, unrounded), or `undefined` when nothing has been sat. */
export function bestPercent(state: HistoryState): number | undefined {
  const best = bestAttempt(state);
  if (best === undefined) return undefined;
  // `score * 100 / max`, not `ratio * 100`: 62.25 / 100 * 100 is 62.25000000000001.
  return best.maxScore > 0 ? (best.score * 100) / best.maxScore : 0;
}
