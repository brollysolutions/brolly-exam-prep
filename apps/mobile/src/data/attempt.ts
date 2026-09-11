import type { AttemptDetail } from '@tslprb/api-contracts';
import type { ExamPattern, TestMeta } from '@tslprb/fixtures';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { isSectionLocked, sectionOf } from './attempt.selectors';
import { persistedJSONStorage } from './storage';
import type { PaperQuestion } from './api/types';
import type { LocalAnswer, LocalAttempt } from './offline/repositories';

export type Choice = 0 | 1 | 2 | 3;

/** Spec section 5: idle -> running -> submitted | autoSubmitted. */
export type AttemptStatus =
  | 'idle'
  | 'running'
  | 'pendingSubmit'
  | 'submitting'
  | 'syncFailed'
  | 'submitted'
  | 'autoSubmitted';

/** `goto`/`next`/`prev` outcome, so screens know whether to raise the locked toast. */
export type GotoResult = 'ok' | 'locked' | 'invalid';

/**
 * The persisted half of the attempt: plain data only, so every selector in
 * attempt.selectors.ts is a pure function of it and screens can render from a literal.
 */
export type AttemptState = {
  /** Application-owned SQLite identity. */
  attemptId?: string;
  /** FastAPI identity when this local attempt was also created online. */
  serverAttemptId?: string;
  resultId?: string;
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
};

export type StartOptions = {
  /** Local SQLite attempt id; a process-local one is generated when omitted. */
  attemptId?: string;
  /** Server-issued attempt id, independent from the local identity. */
  serverAttemptId?: string;
  /** Server-issued deadline; `now + durationMinutes` when omitted. */
  endsAt?: number;
};

export type AttemptActions = {
  start: (test: TestMeta, options?: StartOptions) => void;
  resumeServer: (test: TestMeta, attempt: AttemptDetail, paper: PaperQuestion[]) => void;
  hydrateLocal: (
    test: TestMeta,
    attempt: LocalAttempt,
    answers: LocalAnswer[],
    paper: PaperQuestion[],
  ) => void;
  setResultId: (resultId: string) => void;
  goto: (n: number) => GotoResult;
  answer: (n: number, choice: Choice) => void;
  clear: (n: number) => void;
  toggleMark: (n: number) => void;
  next: () => GotoResult;
  prev: () => GotoResult;
  submit: () => void;
  autoSubmit: () => void;
  requestSubmission: (auto?: boolean) => void;
  beginSubmission: () => void;
  completeSubmission: (resultId: string, auto: boolean) => void;
  reset: () => void;
};

export type AttemptStore = AttemptState & AttemptActions;

export const ATTEMPT_STORAGE_KEY = 'tslprb.attempt';

const idle: AttemptState = {
  attemptId: undefined,
  serverAttemptId: undefined,
  resultId: undefined,
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
  if (n < 1 || n > state.pattern.totalQuestions) return false;
  return !isSectionLocked(state, sectionOf(state, n));
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
          serverAttemptId: options?.serverAttemptId,
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

      resumeServer: (test, attempt, paper) => {
        const previous = get();
        const byId = new Map(paper.map((question, index) => [question.id, index + 1]));
        const answers: Record<number, Choice> = {};
        const marked: Record<number, true> = {};
        const visited: Record<number, true> = {};
        for (const answer of attempt.answers) {
          const number = byId.get(answer.question_id);
          if (number === undefined) continue;
          visited[number] = true;
          if (answer.choice !== null && answer.choice >= 0 && answer.choice <= 3)
            answers[number] = answer.choice as Choice;
          if (answer.marked) marked[number] = true;
        }
        const current =
          previous.attemptId === attempt.id && previous.current <= test.pattern.totalQuestions
            ? previous.current
            : 1;
        visited[current] = true;
        const base: AttemptState = {
          ...idle,
          attemptId:
            previous.serverAttemptId === attempt.id && previous.attemptId
              ? previous.attemptId
              : attempt.id,
          serverAttemptId: attempt.id,
          resultId:
            previous.serverAttemptId === attempt.id || previous.attemptId === attempt.id
              ? previous.resultId
              : undefined,
          testId: attempt.test_id,
          pattern: test.pattern,
          endsAt: Date.parse(attempt.ends_at),
          current,
          answers,
          marked,
          visited,
          sectionUnlocked:
            previous.attemptId === attempt.id ? previous.sectionUnlocked : [],
          status:
            attempt.status === 'in_progress'
              ? 'running'
              : attempt.status === 'auto_submitted'
                ? 'autoSubmitted'
                : 'submitted',
          currentEnteredAt:
            previous.attemptId === attempt.id ? previous.currentEnteredAt : Date.now(),
        };
        set({ ...base, sectionUnlocked: withUnlocks(base) });
      },

      hydrateLocal: (test, attempt, localAnswers, paper) => {
        const byId = new Map(paper.map((question, index) => [question.id, index + 1]));
        const answers: Record<number, Choice> = {};
        const marked: Record<number, true> = {};
        const visited: Record<number, true> = {};
        for (const answer of localAnswers) {
          const number = byId.get(answer.questionId);
          if (number === undefined) continue;
          if (answer.visited) visited[number] = true;
          if (answer.choice !== null) answers[number] = answer.choice as Choice;
          if (answer.marked) marked[number] = true;
        }
        const byStableId = attempt.currentQuestionId
          ? byId.get(attempt.currentQuestionId)
          : undefined;
        const current =
          byStableId ??
          (attempt.currentQuestion <= test.pattern.totalQuestions ? attempt.currentQuestion : 1);
        visited[current] = true;
        const expired = attempt.endsAt <= Date.now();
        const base: AttemptState = {
          ...idle,
          attemptId: attempt.id,
          serverAttemptId: attempt.serverAttemptId,
          resultId: attempt.resultId,
          testId: attempt.testId,
          pattern: test.pattern,
          endsAt: attempt.endsAt,
          current,
          answers,
          marked,
          visited,
          sectionUnlocked: attempt.sectionUnlocked,
          status:
            attempt.status === 'submitted'
              ? 'submitted'
              : attempt.status === 'auto_submitted' || (expired && attempt.status === 'running')
                ? 'autoSubmitted'
                : attempt.status === 'submitting'
                  ? 'submitting'
                  : attempt.status === 'sync_failed'
                    ? 'syncFailed'
                    : attempt.status === 'pending_submit'
                    ? attempt.submissionAuto
                      ? 'autoSubmitted'
                      : 'pendingSubmit'
                : 'running',
          currentEnteredAt: attempt.currentEnteredAt ?? Date.now(),
        };
        set({ ...base, sectionUnlocked: withUnlocks(base) });
      },

      setResultId: (resultId) => set({ resultId }),

      goto: (n) => {
        const state = get();
        if (!state.pattern || n < 1 || n > state.pattern.totalQuestions) return 'invalid';
        // Already here: a re-tap of the current cell must not restart the per-question
        // clock, or "time on this question" resets every time the palette is reopened.
        if (n === state.current) return 'ok';
        if (isSectionLocked(state, sectionOf(state, n))) return 'locked';
        set({
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
        set({ status: 'submitted' });
      },

      autoSubmit: () => {
        if (get().status !== 'running') return;
        set({ status: 'autoSubmitted' });
      },

      requestSubmission: (auto = false) => {
        if (get().status !== 'running') return;
        set({ status: auto ? 'autoSubmitted' : 'pendingSubmit' });
      },

      beginSubmission: () => {
        if (!['pendingSubmit', 'autoSubmitted'].includes(get().status)) return;
        set({ status: 'submitting' });
      },

      completeSubmission: (resultId, auto) =>
        set({ resultId, status: auto ? 'autoSubmitted' : 'submitted' }),

      reset: () => set({ ...idle }),
    }),
    {
      name: ATTEMPT_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s): AttemptState => ({
        attemptId: s.attemptId,
        serverAttemptId: s.serverAttemptId,
        resultId: s.resultId,
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
      }),
    },
  ),
);
