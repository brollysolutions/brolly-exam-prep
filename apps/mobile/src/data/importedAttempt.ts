import { isImportedTest, type Question } from '@/data/content';
import { paperForTest, TESTS as FIXTURE_TESTS, type TestMeta } from '@tslprb/fixtures';
import type { PaperQuestion, ReviewPaperQuestion } from './api';

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
type ScorableQuestion = PaperQuestion & Question;

function isScorablePaper(paper: readonly PaperQuestion[]): paper is readonly ScorableQuestion[] {
  return paper.every(
    (question) =>
      'correct' in question &&
      typeof question.correct === 'number' &&
      'explanation' in question &&
      typeof question.explanation === 'object' &&
      ['arithmetic', 'reasoning', 'gs', 'telangana', 'english'].includes(question.section),
  );
}

/** The explicitly imported SI practice paper is the only production fixture-backed test. */
export function getImportedTestMeta(id: string): TestMeta | undefined {
  if (!isImportedTest(id)) return undefined;
  return FIXTURE_TESTS.find((test) => test.id === id);
}

export function getImportedPaper(id: string): Question[] {
  const meta = getImportedTestMeta(id);
  return meta ? paperForTest(meta) : [];
}

export function getImportedReviewPaper(id: string): ReviewPaperQuestion[] {
  const completed = useCompletedTestsStore.getState().tests[id];
  if (!completed || !canReviewImportedTest(id)) return [];
  const paper = getImportedPaper(id);
  return completed.result.review.flatMap((review) => {
    const question = paper[review.questionNo - 1];
    if (!question) return [];
    return [
      {
        ...question,
        yourChoice: review.your,
        marked: false,
        seconds: review.seconds,
      },
    ];
  });
}

export function completeImportedAttempt(paper: readonly PaperQuestion[]): void {
  const state = useAttemptStore.getState();
  if (!state.testId || !isImportedTest(state.testId) || !state.attemptId) return;
  if (state.status !== 'submitted' && state.status !== 'autoSubmitted') return;
  const meta = getImportedTestMeta(state.testId);
  if (!meta || paper.length !== meta.pattern.totalQuestions) return;
  if (!isScorablePaper(paper)) return;
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
