import type { ExamPattern, TestMeta } from '@tslprb/fixtures/src/runtime';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isSectionLocked, sectionOf } from './attempt.selectors';
import { persistedJSONStorage } from './storage';

export type Choice = 0 | 1 | 2 | 3;

/** Spec section 5: idle -> running -> submitted | autoSubmitted. */
export type AttemptStatus = 'idle' | 'running' | 'submitted' | 'autoSubmitted';

/** `goto`/`next`/`prev` outcome, so screens know whether to raise the locked toast. */
export type GotoResult = 'ok' | 'locked' | 'invalid';

/**
 * The persisted half of the attempt: plain data only, so every selector in
 * attempt.selectors.ts is a pure function of it and screens can render from a literal.
 */
export type AttemptState = {
  attemptId?: string;
  testId?: string;
  pattern?: ExamPattern;
  /** Epoch ms deadline. All timer maths is `endsAt - now`; never a decrementing counter. */
  endsAt?: number;
  /** 1-based question number on screen. */
  current: number;
  /**
   * Keyed by 1-based question number. These three survive a cold start as JSON, so after
   * rehydration the *runtime* keys are strings ("7"), not numbers — harmless for
   * `answers[n]` lookups (JS coerces the index) but never `Object.keys(...).map(Number)`
   * and compare identity, and never assume insertion order.
   */
  answers: Record<number, Choice>;
  marked: Record<number, true>;
  visited: Record<number, true>;
  /** Sticky per-section unlock record; see `isSectionLocked`. */
  sectionUnlocked: boolean[];
  status: AttemptStatus;
  /** Epoch ms the candidate landed on `current`, for "time on this question". */
  currentEnteredAt?: number;
  questionSeconds?: Record<number, number>;
  submittedAt?: number;
};

export type StartOptions = {
  /** Server-issued attempt id; a local one is generated when omitted. */
  attemptId?: string;
  /** Server-issued deadline; `now + durationMinutes` when omitted. */
  endsAt?: number;
};

export type AttemptActions = {
  start: (test: TestMeta, options?: StartOptions) => void;
  goto: (n: number) => GotoResult;
  answer: (n: number, choice: Choice) => void;
  clear: (n: number) => void;
  toggleMark: (n: number) => void;
  next: () => GotoResult;
  prev: () => GotoResult;
  submit: () => void;
  autoSubmit: () => void;
  reset: () => void;
};

export type AttemptStore = AttemptState & AttemptActions;

export const ATTEMPT_STORAGE_KEY = 'tslprb.attempt';

const idle: AttemptState = {
  attemptId: undefined,
  testId: undefined,
  pattern: undefined,
  endsAt: undefined,
  current: 1,
  answers: {},
  marked: {},
  visited: {},
  sectionUnlocked: [],
  status: 'idle',
  currentEnteredAt: undefined,
  questionSeconds: {},
  submittedAt: undefined,
};

/** Sticky: a section that has ever been unlocked stays unlocked for the rest of the attempt. */
function withUnlocks(state: AttemptState): boolean[] {
  const pattern = state.pattern;
  if (!pattern) return [];
  return pattern.sections.map(
    (_, i) => state.sectionUnlocked[i] === true || !isSectionLocked(state, i),
  );
}

/** Writes are accepted only on a running attempt, inside an unlocked section. */
function writable(state: AttemptState, n: number): boolean {
  if (state.status !== 'running' || !state.pattern) return false;
  if (state.endsAt !== undefined && Date.now() >= state.endsAt) return false;
  if (n < 1 || n > state.pattern.totalQuestions) return false;
  return !isSectionLocked(state, sectionOf(state, n));
}

/** Accumulate real time over repeated visits; never count time after the deadline. */
function questionTimes(state: AttemptState, now = Date.now()): Record<number, number> {
  const seconds = { ...state.questionSeconds };
  if (state.status === 'running' && state.currentEnteredAt !== undefined) {
    const end = Math.min(now, state.endsAt ?? now);
    seconds[state.current] =
      (seconds[state.current] ?? 0) + Math.max(0, end - state.currentEnteredAt) / 1000;
  }
  return seconds;
}

export const useAttemptStore = create<AttemptStore>()(
  persist(
    (set, get) => ({
      ...idle,

      start: (test, options) => {
        const now = Date.now();
        const base: AttemptState = {
          ...idle,
          attemptId: options?.attemptId ?? `local-${test.id}-${now.toString(36)}`,
          testId: test.id,
          pattern: test.pattern,
          endsAt: options?.endsAt ?? now + test.pattern.durationMinutes * 60_000,
          current: 1,
          visited: { 1: true },
          status: 'running',
          currentEnteredAt: now,
        };
        set({ ...base, sectionUnlocked: withUnlocks(base) });
      },

      goto: (n) => {
        const state = get();
        if (!state.pattern || n < 1 || n > state.pattern.totalQuestions) return 'invalid';
        // Already here: a re-tap of the current cell must not restart the per-question
        // clock, or "time on this question" resets every time the palette is reopened.
        if (n === state.current) return 'ok';
        if (isSectionLocked(state, sectionOf(state, n))) return 'locked';
        set({
          questionSeconds: questionTimes(state),
          current: n,
          visited: { ...state.visited, [n]: true },
          currentEnteredAt: Date.now(),
        });
        return 'ok';
      },

      answer: (n, choice) => {
        const state = get();
        if (!writable(state, n)) return;
        const next: AttemptState = {
          ...state,
          answers: { ...state.answers, [n]: choice },
          visited: { ...state.visited, [n]: true },
        };
        set({
          answers: next.answers,
          visited: next.visited,
          sectionUnlocked: withUnlocks(next),
        });
      },

      clear: (n) => {
        const state = get();
        if (!writable(state, n)) return;
        if (state.answers[n] === undefined) return;
        const answers = { ...state.answers };
        delete answers[n];
        set({ answers, sectionUnlocked: withUnlocks({ ...state, answers }) });
      },

      toggleMark: (n) => {
        const state = get();
        if (!writable(state, n)) return;
        const marked = { ...state.marked };
        if (marked[n]) delete marked[n];
        else marked[n] = true;
        set({ marked, visited: { ...state.visited, [n]: true } });
      },

      next: () => get().goto(get().current + 1),
      prev: () => get().goto(get().current - 1),

      submit: () => {
        if (get().status !== 'running') return;
        const state = get();
        const now = Date.now();
        set({
          status: state.endsAt !== undefined && now >= state.endsAt ? 'autoSubmitted' : 'submitted',
          submittedAt: Math.min(now, state.endsAt ?? now),
          questionSeconds: questionTimes(state, now),
        });
      },

      autoSubmit: () => {
        if (get().status !== 'running') return;
        const state = get();
        const now = Date.now();
        set({
          status: 'autoSubmitted',
          submittedAt: Math.min(now, state.endsAt ?? now),
          questionSeconds: questionTimes(state, now),
        });
      },

      reset: () => set({ ...idle }),
    }),
    {
      name: ATTEMPT_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): AttemptState => ({
        attemptId: s.attemptId,
        testId: s.testId,
        pattern: s.pattern,
        endsAt: s.endsAt,
        current: s.current,
        answers: s.answers,
        marked: s.marked,
        visited: s.visited,
        sectionUnlocked: s.sectionUnlocked,
        status: s.status,
        currentEnteredAt: s.currentEnteredAt,
        questionSeconds: s.questionSeconds,
        submittedAt: s.submittedAt,
      }),
    },
  ),
);
