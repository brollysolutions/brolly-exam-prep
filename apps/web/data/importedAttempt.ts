import type { Question } from '@tslprb/fixtures';
import { isImportedTest, TESTS } from '../lib/test-catalog';

import { useAttemptStore } from './attempt';
import { useCompletedTestsStore } from './completedTests';
import { useHistoryStore } from './history';
import { scoreAttempt } from './score';

/** UI review access is withheld during a retake as well as before the first submission. */
export function canReviewImportedTest(id: string): boolean {
  const active = useAttemptStore.getState();
  if (active.testId === id && active.status === 'running') return false;
  return useCompletedTestsStore.getState().tests[id] !== undefined;
}

/** Called immediately after manual or timed submission, before navigating to results. */
export function completeImportedAttempt(paper: readonly Question[]): void {
  const state = useAttemptStore.getState();
  if (!isImportedTest(state.testId) || !state.attemptId) return;
  if (state.status !== 'submitted' && state.status !== 'autoSubmitted') return;
  const meta = TESTS.find((test) => test.id === state.testId);
  if (!meta || paper.length !== meta.pattern.totalQuestions) return;
  if (paper.some((q) => !q.id.startsWith(`${meta.id}-`))) return;
  const previous = useCompletedTestsStore.getState().tests[meta.id];
  if (previous?.attemptId === state.attemptId) return;
  const now = Date.now();
  const durationMs = meta.pattern.durationMinutes * 60_000;
  const startedAt = (state.endsAt ?? now) - durationMs;
  const elapsedSec = Math.floor(Math.max(0, Math.min(durationMs, now - startedAt)) / 1000);
  const result = scoreAttempt({
    id: state.attemptId,
    testTitleN: 1,
    title: meta.title,
    paper,
    pattern: meta.pattern,
    answers: state.answers,
    elapsedSec,
  });
  useCompletedTestsStore.getState().save(meta.id, { attemptId: state.attemptId, result });
  useHistoryStore.getState().record({
    id: result.id,
    testId: meta.id,
    score: result.score,
    maxScore: result.maxScore,
    at: now,
  });
}
