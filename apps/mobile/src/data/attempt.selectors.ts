import type { PaletteState } from '@tslprb/design-tokens';
import { sectionIndexOf, type ExamPattern } from '@tslprb/fixtures/src/runtime';

import type { AttemptState } from './attempt';

export type { PaletteState };

export type PaletteCounts = {
  answered: number;
  notAnswered: number;
  marked: number;
  notVisited: number;
};

/** Total questions in the armed paper; 0 when no attempt is running. */
export const totalQuestions = (state: AttemptState): number => state.pattern?.totalQuestions ?? 0;

/** 1-based question numbers covered by a section, inclusive. */
export function sectionRange(
  pattern: ExamPattern,
  sectionIndex: number,
): { first: number; last: number } {
  let first = 1;
  for (let i = 0; i < sectionIndex; i += 1) first += pattern.sections[i]?.questions ?? 0;
  return { first, last: first + (pattern.sections[sectionIndex]?.questions ?? 0) - 1 };
}

/** Deadline-based, never a counter: `max(0, endsAt - now)`. */
export const remainingMs = (state: AttemptState, now: number): number =>
  state.endsAt === undefined ? 0 : Math.max(0, state.endsAt - now);

/** Palette cell state, in the prototype's precedence: answered beats marked. */
export function cellState(state: AttemptState, n: number): PaletteState {
  const answered = state.answers[n] !== undefined;
  const marked = state.marked[n] === true;
  if (answered && marked) return 'am';
  if (answered) return 'a';
  if (marked) return 'm';
  return state.visited[n] === true ? 'na' : 'nv';
}

/** Legend counts: answered, visited-but-unanswered, marked (any), never opened. */
export function counts(state: AttemptState): PaletteCounts {
  const total = totalQuestions(state);
  let answered = 0;
  let notAnswered = 0;
  let marked = 0;
  let visited = 0;
  for (let n = 1; n <= total; n += 1) {
    const hasAnswer = state.answers[n] !== undefined;
    const wasVisited = state.visited[n] === true || hasAnswer;
    if (hasAnswer) answered += 1;
    if (state.marked[n] === true) marked += 1;
    if (wasVisited) {
      visited += 1;
      if (!hasAnswer) notAnswered += 1;
    }
  }
  return { answered, notAnswered, marked, notVisited: total - visited };
}

/** Section index (0-based) holding a 1-based question number; -1 when unarmed. */
export const sectionOf = (state: AttemptState, n: number): number =>
  state.pattern ? sectionIndexOf(state.pattern, n) : -1;

/** Vacuously true for a zero-question section, so an empty gate never locks what follows. */
function isSectionFullyAnswered(state: AttemptState, sectionIndex: number): boolean {
  if (!state.pattern) return false;
  const { first, last } = sectionRange(state.pattern, sectionIndex);
  for (let n = first; n <= last; n += 1) if (state.answers[n] === undefined) return false;
  return true;
}

/**
 * A section is locked while its `unlockAfter` section still has an unanswered question.
 * Unlocking is sticky: `sectionUnlocked[idx]` records that the gate was once satisfied, so
 * clearing an answer later never yanks a section away from a candidate mid-attempt.
 */
export function isSectionLocked(state: AttemptState, sectionIndex: number): boolean {
  const pattern = state.pattern;
  if (!pattern) return false;
  const spec = pattern.sections[sectionIndex];
  if (!spec?.unlockAfter) return false;
  if (state.sectionUnlocked[sectionIndex] === true) return false;
  const gate = pattern.sections.findIndex((s) => s.id === spec.unlockAfter);
  if (gate < 0) return false;
  return !isSectionFullyAnswered(state, gate);
}

/** 0..1 for the progress rail: answered questions over the whole paper. */
export function progressFraction(state: AttemptState): number {
  const total = totalQuestions(state);
  return total === 0 ? 0 : counts(state).answered / total;
}

/** Whole seconds spent on the question currently on screen. */
export function elapsedOnCurrentSec(state: AttemptState, now: number): number {
  if (state.currentEnteredAt === undefined) return 0;
  return Math.max(0, Math.floor((now - state.currentEnteredAt) / 1000));
}
