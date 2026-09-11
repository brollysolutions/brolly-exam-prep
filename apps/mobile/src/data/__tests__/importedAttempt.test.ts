import { paperForTest, SI_MOCK_01_ID, TESTS } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { MockApi } from '../testing/mockApi';
import { useAttemptStore, type Choice } from '../attempt';
import { useCompletedTestsStore } from '../completedTests';
import { useHistoryStore } from '../history';
import { canReviewImportedTest, completeImportedAttempt } from '../importedAttempt';
import { wipeLocalData } from '../signOut';

const meta = TESTS.find((t) => t.id === SI_MOCK_01_ID)!;
const paper = paperForTest(meta);
const api = new MockApi();
const saved = () => useCompletedTestsStore.getState().tests[meta.id]?.result;

beforeAll(() => initI18n('en'));
beforeEach(() => {
  useAttemptStore.getState().reset();
  useCompletedTestsStore.getState().reset();
  useHistoryStore.getState().reset();
});

it('imports 200 distinct bilingual questions, four options and explanations in 50/50/100 sections', async () => {
  expect(await api.getPaper(meta.id)).toEqual(paper);
  expect(paper).toHaveLength(200);
  expect(new Set(paper.map((q) => q.id)).size).toBe(200);
  expect(
    ['arithmetic', 'reasoning', 'gs'].map((s) => paper.filter((q) => q.section === s).length),
  ).toEqual([50, 50, 100]);
  expect(meta.pattern.durationMinutes).toBe(190);
  for (const q of paper) {
    expect(q.correct).toBeGreaterThanOrEqual(0);
    expect(q.correct).toBeLessThan(4);
    for (const lang of ['en', 'te'] as const) {
      expect(q.text[lang].trim()).not.toBe('');
      expect(q.options[lang]).toHaveLength(4);
      expect(new Set(q.options[lang]).size).toBe(4);
      expect(q.options[lang].every((o) => o.trim().length > 0)).toBe(true);
      expect(q.explanation[lang].trim()).not.toBe('');
    }
  }
});

it('includes the shared data table on both arithmetic data questions', () => {
  for (const n of [49, 50]) {
    expect(paper[n - 1].text.en.replaceAll(',', '')).toContain('1500');
    expect(paper[n - 1].text.te.replaceAll(',', '')).toContain('1500');
  }
});

it('does not reveal results before submission or while a retake is running', async () => {
  await expect(api.getResultDetail(meta.id)).rejects.toMatchObject({ status: 403 });
  useAttemptStore.getState().start(meta);
  completeImportedAttempt(paper);
  expect(saved()).toBeUndefined();
  useAttemptStore.getState().submit();
  completeImportedAttempt(paper);
  expect(canReviewImportedTest(meta.id)).toBe(true);
  useAttemptStore.getState().start(meta);
  expect(canReviewImportedTest(meta.id)).toBe(false);
  await expect(api.getResultDetail(meta.id)).rejects.toMatchObject({ status: 403 });
});

it('scores manual submission using the actual answers and reviews all 200 questions', async () => {
  useAttemptStore.getState().start(meta);
  useAttemptStore.getState().answer(1, paper[0].correct);
  useAttemptStore.getState().answer(51, ((paper[50].correct + 1) % 4) as Choice);
  useAttemptStore.getState().answer(200, paper[199].correct);
  useAttemptStore.getState().submit();
  completeImportedAttempt(paper);
  expect(saved()).toMatchObject({ score: 2, maxScore: 200, correct: 2, wrong: 1, skipped: 197 });
  expect(saved()?.review).toHaveLength(200);
  expect(saved()?.review[199].your).toBe(paper[199].correct);
  expect(await api.getResultDetail(meta.id)).toEqual(saved());
  completeImportedAttempt(paper);
  expect(useHistoryStore.getState().attempts).toHaveLength(1);
});

it('scores timed submission, survives rehydration, and clears results on sign-out', async () => {
  useAttemptStore.getState().start(meta);
  for (let n = 1; n <= 200; n++) useAttemptStore.getState().answer(n, paper[n - 1].correct);
  useAttemptStore.getState().autoSubmit();
  completeImportedAttempt(paper);
  expect(saved()).toMatchObject({ score: 200, correct: 200, wrong: 0, skipped: 0 });
  await useCompletedTestsStore.persist.rehydrate();
  useAttemptStore.getState().reset();
  expect((await api.getResultDetail(meta.id)).score).toBe(200);
  wipeLocalData();
  expect(saved()).toBeUndefined();
  expect(canReviewImportedTest(meta.id)).toBe(false);
});

it('copies the imported bank so a consumer cannot mutate future papers', () => {
  const copy = paperForTest(meta);
  copy[0].options.en[0] = 'changed';
  copy[0].text.te = 'changed';
  expect(paperForTest(meta)).toEqual(paper);
});
