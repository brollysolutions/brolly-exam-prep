import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SubmitInput } from '@tslprb/api-contracts';
import { getApi, type PaperQuestion, type ResultDetail } from './api';
import { useAttemptStore } from './attempt';
import { useCompletedTestsStore } from './completedTests';
import { useHistoryStore } from './history';
import { persistedJSONStorage } from './storage';

type Pending = {
  localId: string;
  testId: string;
  remoteId?: string;
  body: SubmitInput;
  at: number;
};
export const SUBMISSIONS_STORAGE_KEY = 'tslprb.pending-submissions';
export const useSubmissions = create<{
  jobs: Record<string, Pending>;
  put: (job: Pending) => void;
  remove: (id: string) => void;
  reset: () => void;
}>()(
  persist(
    (set) => ({
      jobs: {},
      reset: () => set({ jobs: {} }),
      put: (job) => set((state) => ({ jobs: { ...state.jobs, [job.localId]: job } })),
      remove: (id) =>
        set((state) => {
          const jobs = { ...state.jobs };
          delete jobs[id];
          return { jobs };
        }),
    }),
    { name: SUBMISSIONS_STORAGE_KEY, storage: persistedJSONStorage() },
  ),
);
const flights = new Map<string, Promise<ResultDetail>>();

function send(job: Pending): Promise<ResultDetail> {
  const existing = flights.get(job.localId);
  if (existing) return existing;
  const request = (async () => {
    const api = getApi();
    const ensurePending = () => {
      if (!useSubmissions.getState().jobs[job.localId]) throw new Error('Submission cancelled');
    };
    if (!job.remoteId) {
      const remote = await api.createAttempt({ test_id: job.testId });
      if (!useSubmissions.getState().jobs[job.localId]) throw new Error('Submission cancelled');
      job = { ...job, remoteId: remote.id };
      useSubmissions.getState().put(job);
    }
    const { result_id } = await api.submitAttempt(job.remoteId!, job.body);
    ensurePending();
    const result = await api.getResultDetail(result_id);
    ensurePending();
    // Cache reviewed questions for later offline access before clearing the pending job.
    await api.getReviewPaper(result_id);
    if (!useSubmissions.getState().jobs[job.localId]) throw new Error('Submission cancelled');
    const previous = useCompletedTestsStore.getState().tests[job.testId];
    const newer = Object.values(useSubmissions.getState().jobs).some(
      (other) => other.testId === job.testId && other.at > job.at,
    );
    if (!newer && (!previous || (previous.completedAt ?? 0) <= job.at))
      useCompletedTestsStore.getState().save(job.testId, {
        attemptId: job.localId,
        result,
        completedAt: job.at,
      });
    useHistoryStore.getState().record({
      id: result.id,
      testId: job.testId,
      score: result.score,
      maxScore: result.maxScore,
      at: job.at,
    });
    useSubmissions.getState().remove(job.localId);
    return result;
  })().finally(() => flights.delete(job.localId));
  flights.set(job.localId, request);
  return request;
}

/** Freeze answers immediately; keep the final snapshot until the server confirms the result. */
export function saveCompletedAttempt(
  paper: readonly PaperQuestion[],
  now = Date.now(),
): Promise<ResultDetail> {
  const state = useAttemptStore.getState();
  if (
    !state.testId ||
    !state.attemptId ||
    !state.pattern ||
    !['submitted', 'autoSubmitted'].includes(state.status) ||
    paper.length !== state.pattern.totalQuestions
  )
    return Promise.reject(new Error('No complete submitted attempt'));
  const previous = useCompletedTestsStore.getState().tests[state.testId];
  if (previous?.attemptId === state.attemptId) return Promise.resolve(previous.result);
  const pending = useSubmissions.getState().jobs[state.attemptId];
  if (pending) return send(pending);
  const duration = state.pattern.durationMinutes * 60_000;
  const submittedAt = state.submittedAt ?? now;
  const job: Pending = {
    localId: state.attemptId,
    testId: state.testId,
    at: submittedAt,
    remoteId: state.attemptId.startsWith('local-') ? undefined : state.attemptId,
    body: {
      elapsed_seconds:
        Math.max(0, Math.min(duration, submittedAt - ((state.endsAt ?? submittedAt) - duration))) /
        1000,
      answers: paper.map((q, index) => ({
        question_id: q.id,
        choice: state.answers[index + 1] ?? null,
        marked: state.marked[index + 1] === true,
        seconds: state.questionSeconds?.[index + 1] ?? 0,
      })),
    },
  };
  useSubmissions.getState().put(job);
  return send(job);
}

export async function loadCompletedResult(testId: string): Promise<ResultDetail> {
  const state = useAttemptStore.getState();
  if (state.testId === testId && state.status === 'running') throw new Error('Submit first');
  const pending = Object.values(useSubmissions.getState().jobs)
    .filter((job) => job.testId === testId)
    .sort((a, b) => b.at - a.at)[0];
  if (pending) return send(pending);
  const completed = useCompletedTestsStore.getState().tests[testId];
  if (
    state.testId === testId &&
    ['submitted', 'autoSubmitted'].includes(state.status) &&
    completed?.attemptId !== state.attemptId
  ) {
    const paper =
      state.attemptId && !state.attemptId.startsWith('local-')
        ? await getApi().getAttemptPaper(state.attemptId)
        : await getApi().getPaper(testId);
    const current = useAttemptStore.getState();
    if (current.attemptId !== state.attemptId || current.testId !== state.testId)
      throw new Error('Attempt changed while loading its paper');
    return saveCompletedAttempt(paper);
  }
  if (!completed) throw new Error('No submitted attempt');
  return getApi().getResultDetail(completed.result.id);
}

export async function retryPendingSubmissions(): Promise<void> {
  await Promise.allSettled(Object.values(useSubmissions.getState().jobs).map(send));
}
