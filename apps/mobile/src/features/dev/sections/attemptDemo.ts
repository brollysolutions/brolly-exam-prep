import { buildPaper, FREE_MOCK_SHORT, TESTS, type Question } from '@tslprb/fixtures';

import type { AttemptState, Choice } from '@/data/attempt';

/** The free mock the prototype demonstrates: 40 questions, 4 sections × 10, 60 minutes. */
export const DEMO_TEST = TESTS[0];
export const DEMO_PAPER: Question[] = buildPaper(FREE_MOCK_SHORT.sections);

/** 58:24 — the clock frozen in the prototype's screenshots. */
export const DEMO_REMAINING_SEC = 3504;
/** Seconds on the question on screen. */
export const DEMO_ELAPSED_SEC = 41;

const answers: Record<number, Choice> = { 1: 2, 2: 0, 3: 1, 5: 3, 6: 0, 8: 2, 9: 1, 11: 3 };
const marked: Record<number, true> = { 4: true, 8: true, 10: true };
const visited: Record<number, true> = {};
for (let n = 1; n <= 12; n += 1) visited[n] = true;

/**
 * The prototype's initial attempt state, shared by the dev states gallery and the tests so the
 * two never drift: 8 answered, 4 visited-unanswered, 3 marked, 28 untouched, and the Telangana
 * section still locked behind General Studies.
 */
export const DEMO_ATTEMPT: AttemptState = {
  attemptId: 'demo-attempt',
  testId: DEMO_TEST.id,
  pattern: FREE_MOCK_SHORT,
  endsAt: undefined,
  current: 12,
  answers,
  marked,
  visited,
  // Sections 0-2 are ungated; 3 (Telangana) waits on General Studies.
  sectionUnlocked: [true, true, true, false],
  status: 'running',
  currentEnteredAt: undefined,
};

/** A named variant of the demo state — `{ ...DEMO_ATTEMPT, ...patch }` with the same pattern. */
export const demoAttempt = (patch: Partial<AttemptState>): AttemptState => ({
  ...DEMO_ATTEMPT,
  ...patch,
});
