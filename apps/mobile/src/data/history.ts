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
 * The best score so far, or `undefined` when nothing has been sat — which is a different
 * thing from zero and has to render differently.
 */
export function bestScore(state: HistoryState): number | undefined {
  if (state.attempts.length === 0) return undefined;
  return state.attempts.reduce((best, a) => Math.max(best, a.score), Number.NEGATIVE_INFINITY);
}

/** The paper the best score was scored on, for the marks-out-of it belongs to. */
export function bestAttempt(state: HistoryState): AttemptRecord | undefined {
  return state.attempts.reduce<AttemptRecord | undefined>(
    (best, a) => (best === undefined || a.score > best.score ? a : best),
    undefined,
  );
}
