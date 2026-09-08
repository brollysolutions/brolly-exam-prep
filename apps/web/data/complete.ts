import type { Question } from '@tslprb/fixtures';
import { TESTS, paperForTest } from '../lib/test-catalog';
import { useAttemptStore } from './attempt';
import { useCompletedTestsStore } from './completedTests';
import { useHistoryStore } from './history';
import { scoreAttempt } from './score';

/** Local marking uses the same scorer as the original site's offline result fallback. */
export function saveCompletedAttempt(paper: readonly Question[], now = Date.now()) {
  const state = useAttemptStore.getState();
  if (!state.testId || !state.attemptId || !['submitted', 'autoSubmitted'].includes(state.status))
    return;
  const meta = TESTS.find((test) => test.id === state.testId);
  if (!meta || paper.length !== meta.pattern.totalQuestions) return;
  const expected = paperForTest(meta);
  if (paper.some((question, index) => question.id !== expected[index]?.id)) return;
  const previous = useCompletedTestsStore.getState().tests[meta.id];
  if (previous?.attemptId === state.attemptId) return previous.result;
  const duration = meta.pattern.durationMinutes * 60_000;
  const result = scoreAttempt({
    id: state.attemptId,
    testTitleN: 1,
    title: meta.title,
    paper,
    pattern: meta.pattern,
    answers: state.answers,
    elapsedSec: Math.floor(
      Math.max(0, Math.min(duration, now - ((state.endsAt ?? now) - duration))) / 1000,
    ),
  });
  useCompletedTestsStore.getState().save(meta.id, { attemptId: state.attemptId, result });
  useHistoryStore
    .getState()
    .record({
      id: state.attemptId,
      testId: meta.id,
      score: result.score,
      maxScore: result.maxScore,
      at: now,
    });
  return result;
}
