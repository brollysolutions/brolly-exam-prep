import assert from 'node:assert/strict';
import { before, beforeEach, test, mock } from 'node:test';
import { TESTS, SI_MOCK_01_ID, paperForTest } from '@tslprb/fixtures';
import { attemptHref, resultHref, solutionsHref, returnHref, withReturn } from '../lib/routes';
import {
  CONSTABLE_MOCK_01_ID,
  SI_MOCK_02_ID,
  TESTS as webTests,
  paperForTest as webPaperForTest,
  isImportedTest,
} from '../lib/test-catalog';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  },
});

let attempt: typeof import('../data/attempt');
let completed: typeof import('../data/completedTests');
let history: typeof import('../data/history');
let session: typeof import('../data/session');
let study: typeof import('../data/study');
let account: typeof import('../data/signOut');
let completion: typeof import('../data/complete');
const meta = TESTS.find((test) => test.id === SI_MOCK_01_ID)!;
const paper = paperForTest(meta);

before(async () => {
  const { initI18n } = await import('../lib/i18n');
  await initI18n('en');
  attempt = await import('../data/attempt');
  completed = await import('../data/completedTests');
  history = await import('../data/history');
  session = await import('../data/session');
  study = await import('../data/study');
  account = await import('../data/signOut');
  completion = await import('../data/complete');
});
beforeEach(() => account.wipeLocalData());

// Boundary fake: exercise the persisted submission queue separately from Python's real-DB scoring tests.
before(async () => {
  const { getApi } = await import('../data/api');
  const { scoreAttempt } = await import('../data/score');
  const attempts = new Map<string, string>();
  const results = new Map<string, ReturnType<typeof scoreAttempt>>();
  mock.method(getApi(), 'createAttempt', async ({ test_id }: { test_id: string }) => {
    const id = `remote-${attempts.size}`;
    attempts.set(id, test_id);
    return {
      id,
      test_id,
      started_at: new Date().toISOString(),
      ends_at: new Date(Date.now() + 60000).toISOString(),
      status: 'in_progress',
    };
  });
  mock.method(
    getApi(),
    'submitAttempt',
    async (id: string, body: import('@tslprb/api-contracts').SubmitInput) => {
      const testId = attempts.get(id)!;
      const test = webTests.find((t) => t.id === testId)!;
      const paper = webPaperForTest(test);
      if (body.answers?.some((a) => !paper.some((q) => q.id === a.question_id)))
        throw new Error('Invalid question');
      if (!results.has(id))
        results.set(
          id,
          scoreAttempt({
            id,
            testTitleN: 1,
            title: test.title,
            paper,
            pattern: test.pattern,
            elapsedSec: body.elapsed_seconds ?? 0,
            answers: Object.fromEntries(
              paper.flatMap((q, n) => {
                const answer = body.answers?.find((a) => a.question_id === q.id);
                return answer?.choice != null ? [[n + 1, answer.choice as 0 | 1 | 2 | 3]] : [];
              }),
            ),
          }),
        );
      return { result_id: id };
    },
  );
  mock.method(getApi(), 'getResultDetail', async (id: string) => results.get(id)!);
  mock.method(getApi(), 'getReviewPaper', async (id: string) =>
    webPaperForTest(webTests.find((t) => t.id === attempts.get(id))!),
  );
});

test('public mock URLs preserve review destinations and login return links', () => {
  assert.equal(attemptHref(CONSTABLE_MOCK_01_ID), '/test/constablemocktest01');
  assert.equal(resultHref(CONSTABLE_MOCK_01_ID), '/test/constablemocktest01/result');
  assert.equal(solutionsHref(CONSTABLE_MOCK_01_ID), '/test/constablemocktest01/solution');
  assert.equal(
    withReturn('/login', solutionsHref(CONSTABLE_MOCK_01_ID)),
    '/login?returnTo=%2Ftest%2Fconstablemocktest01%2Fsolution',
  );
  assert.equal(attemptHref(SI_MOCK_02_ID), '/tests/simocktest02');
  assert.equal(attemptHref(SI_MOCK_01_ID), '/tests/simocktest');
  assert.equal(resultHref(SI_MOCK_02_ID), '/test/si-brolly-02/result');
  assert.equal(solutionsHref(SI_MOCK_02_ID), '/tests/simocktest02/solutions');
  assert.equal(solutionsHref(SI_MOCK_01_ID), '/test/simocktest/solutions');
  assert.equal(
    withReturn('/login', solutionsHref(SI_MOCK_02_ID)),
    '/login?returnTo=%2Ftests%2Fsimocktest02%2Fsolutions',
  );
  assert.equal(
    withReturn('/login', attemptHref(SI_MOCK_02_ID)),
    '/login?returnTo=%2Ftests%2Fsimocktest02',
  );
});

test('withdrawn Constable 01 is absent from the catalogue and cannot be loaded', async () => {
  assert.equal(
    webTests.some((test) => test.id === 'pc-brolly-01'),
    false,
  );
  const { MockApi } = await import('../data/api/mock');
  const api = new MockApi();
  assert.equal(
    (await api.listTests()).some((test) => test.id === 'pc-brolly-01'),
    false,
  );
  await assert.rejects(api.getTest('pc-brolly-01'));
});

test('replacement Constable 01 contains the complete source paper and separates solutions from questions', () => {
  const pc = webTests.find((test) => test.id === CONSTABLE_MOCK_01_ID)!;
  const questions = webPaperForTest(pc);
  assert.equal(pc.pattern.post, 'pc');
  assert.equal(pc.pattern.durationMinutes, 180);
  assert.equal(pc.pattern.totalQuestions, 200);
  assert.equal(pc.free, true);
  assert.equal(isImportedTest(pc.id), true);
  assert.notEqual(pc.id, 'pc-brolly-01');
  assert.equal(
    TESTS.some((test) => test.id === pc.id),
    false,
  );
  assert.equal(questions.length, 200);
  assert.equal(new Set(questions.map((q) => q.id)).size, 200);
  assert.deepEqual(
    pc.pattern.sections.map((section) => [
      section.id,
      questions.filter((q) => q.section === section.id).length,
    ]),
    [
      ['english', 25],
      ['arithmetic', 35],
      ['reasoning', 40],
      ['gs', 100],
    ],
  );
  for (const question of questions) {
    assert.ok(question.id.startsWith(`${pc.id}-`));
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4);
    for (const lang of ['en', 'te'] as const) {
      assert.ok(question.text[lang] && question.explanation[lang]);
      assert.equal(question.options[lang].length, 4);
      assert.ok(question.options[lang].every(Boolean));
      assert.doesNotMatch(
        [question.text[lang], ...question.options[lang]].join('\n'),
        /Correct Answer|Correct Option|Explanation|వివరణ/,
      );
    }
  }
  for (const question of questions.slice(0, 25)) {
    assert.equal(question.text.en, question.text.te);
    assert.deepEqual(question.options.en, question.options.te);
  }
  for (const question of questions.slice(20, 25)) {
    assert.match(question.text.en, /Modern community policing emphasizes/);
  }
  assert.doesNotMatch(questions[19].text.en, /Modern community policing emphasizes/);
  assert.equal(questions[29].correct, 0); // Q030 detailed solution says A; summary table says B.
  assert.equal(questions[34].correct, 1); // Q035 detailed solution says B; summary table says A.
  assert.match(questions[130].explanation.en, /Correct Answer:/); // Q131-Q160 omitted in summary table.
  assert.match(questions[199].text.en, /State Tree of Telangana/);
  questions[0].options.en[0] = 'mutated copy';
  assert.notEqual(webPaperForTest(pc)[0].options.en[0], 'mutated copy');
});

test('Constable 01 reveals all solutions only after submission and closes review during a retake', async () => {
  const pc = webTests.find((test) => test.id === CONSTABLE_MOCK_01_ID)!;
  const { MockApi } = await import('../data/api/mock');
  const { canReviewImportedTest } = await import('../data/importedAttempt');
  const { buildSolutionRows, filterSolutionRows } = await import('../features/result/solutions');
  const api = new MockApi();
  const questions = await api.getPaper(pc.id);
  assert.equal(canReviewImportedTest(pc.id), false);
  await assert.rejects(api.getResultDetail(pc.id));
  attempt.useAttemptStore.getState().start(pc);
  attempt.useAttemptStore.getState().answer(1, questions[0].correct);
  attempt.useAttemptStore.getState().answer(26, ((questions[25].correct + 1) % 4) as 0 | 1 | 2 | 3);
  attempt.useAttemptStore.getState().answer(101, questions[100].correct);
  await assert.rejects(completion.saveCompletedAttempt(questions));
  await assert.rejects(api.getResultDetail(pc.id));
  attempt.useAttemptStore.getState().submit();
  const result = await completion.saveCompletedAttempt(questions)!;
  assert.equal(result.score, 2);
  assert.equal(result.maxScore, 200);
  assert.equal(result.skipped, 197);
  assert.equal(result.review.length, 200);
  assert.equal(canReviewImportedTest(pc.id), true);
  await api.getResultDetail(pc.id);
  const rows = filterSolutionRows(buildSolutionRows(result.review, questions), 'all');
  assert.equal(rows.length, 200);
  assert.equal(rows[199].questionNo, 200);
  assert.equal(rows[199].your, null);
  assert.equal(rows[199].question.explanation.te, questions[199].explanation.te);
  assert.equal(completed.useCompletedTestsStore.getState().tests[SI_MOCK_02_ID], undefined);
  attempt.useAttemptStore.getState().start(pc);
  assert.equal(canReviewImportedTest(pc.id), false);
  await assert.rejects(api.getResultDetail(pc.id));
  attempt.useAttemptStore.setState({ endsAt: Date.now() - 1 });
  attempt.useAttemptStore.getState().autoSubmit();
  assert.ok(await completion.saveCompletedAttempt(questions));
  assert.equal(canReviewImportedTest(pc.id), true);
});

test('SI Mock Test 02 combines all bilingual source questions without changing the shared catalogue', () => {
  const second = webTests.find((test) => test.id === SI_MOCK_02_ID)!;
  const questions = webPaperForTest(second);
  assert.equal(
    TESTS.some((test) => test.id === SI_MOCK_02_ID),
    false,
  );
  assert.equal(isImportedTest(second.id), true);
  assert.equal(second.pattern.durationMinutes, 190);
  assert.equal(questions.length, 200);
  assert.equal(new Set(questions.map((q) => q.id)).size, 200);
  assert.deepEqual(
    ['arithmetic', 'reasoning', 'gs'].map(
      (section) => questions.filter((q) => q.section === section).length,
    ),
    [50, 50, 100],
  );
  for (const question of questions) {
    for (const lang of ['en', 'te'] as const) {
      assert.ok(question.text[lang]);
      assert.equal(question.options[lang].length, 4);
      assert.ok(question.options[lang].every(Boolean));
      assert.ok(question.explanation[lang]);
      assert.doesNotMatch(question.text[lang], /Correct Answer|Correct Option|Explanation|వివరణ/);
    }
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4);
  }
  assert.match(questions[48].text.en, /Hyderabad \| 4,800 \| 45%/);
  assert.match(questions[49].text.en, /Khammam \| 2,800 \| 50%/);
  assert.equal(questions[190].correct, 1); // GS Q091 key explicitly supplied in its solution.
  questions[0].options.en[0] = 'changed copy';
  assert.notEqual(webPaperForTest(second)[0].options.en[0], 'changed copy');
  assert.deepEqual(webPaperForTest(meta), paperForTest(meta));
});

test('SI Mock Test 02 review stays gated until submission, preserves solutions and closes again on retake', async () => {
  const second = webTests.find((test) => test.id === SI_MOCK_02_ID)!;
  const questions = webPaperForTest(second);
  const { canReviewImportedTest } = await import('../data/importedAttempt');
  const { MockApi } = await import('../data/api/mock');
  const api = new MockApi();
  assert.equal(canReviewImportedTest(second.id), false);
  await assert.rejects(api.getResultDetail(second.id));
  attempt.useAttemptStore.getState().start(second);
  attempt.useAttemptStore.getState().answer(1, questions[0].correct);
  attempt.useAttemptStore.getState().answer(51, questions[50].correct === 0 ? 1 : 0);
  await assert.rejects(completion.saveCompletedAttempt(questions));
  assert.equal(canReviewImportedTest(second.id), false);
  attempt.useAttemptStore.getState().submit();
  const result = await completion.saveCompletedAttempt(questions)!;
  assert.equal(result.correct, 1);
  assert.equal(result.score, 1);
  assert.equal(result.review?.length, 200);
  assert.equal(canReviewImportedTest(second.id), true);
  await api.getResultDetail(second.id);
  assert.ok(completed.useCompletedTestsStore.getState().tests[second.id]);
  assert.equal(completed.useCompletedTestsStore.getState().tests[meta.id], undefined);
  attempt.useAttemptStore.getState().start(second);
  assert.equal(canReviewImportedTest(second.id), false);
  await assert.rejects(api.getResultDetail(second.id));
  attempt.useAttemptStore.setState({ endsAt: Date.now() - 1 });
  attempt.useAttemptStore.getState().autoSubmit();
  assert.ok(await completion.saveCompletedAttempt(questions));
  assert.equal(canReviewImportedTest(second.id), true);
});

test('existing Expo storage rehydrates answers, marks, and the original deadline', async () => {
  attempt.useAttemptStore.getState().start(meta);
  const deadline = attempt.useAttemptStore.getState().endsAt;
  attempt.useAttemptStore.getState().answer(1, 2);
  attempt.useAttemptStore.getState().toggleMark(1);
  const saved = memory.get('tslprb.attempt')!;
  attempt.useAttemptStore.getState().reset();
  memory.set('tslprb.attempt', saved);
  await attempt.useAttemptStore.persist.rehydrate();
  const restored = attempt.useAttemptStore.getState();
  assert.equal(restored.answers[1], 2);
  assert.equal(restored.marked[1], true);
  assert.equal(restored.endsAt, deadline);
  assert.equal(restored.status, 'running');
});

test('deadline blocks answer changes, clearing, and marking before the timer callback runs', () => {
  const store = attempt.useAttemptStore;
  store.getState().start(meta);
  store.getState().answer(1, 1);
  store.setState({ endsAt: Date.now() - 1 });
  store.getState().answer(1, 2);
  store.getState().answer(2, 3);
  store.getState().clear(1);
  store.getState().toggleMark(1);
  assert.deepEqual(store.getState().answers, { 1: 1 });
  assert.deepEqual(store.getState().marked, {});
  store.getState().autoSubmit();
  store.getState().submit();
  assert.equal(store.getState().status, 'autoSubmitted');
});

test('section unlocks only after every prerequisite answer and remains unlocked after clearing', () => {
  const short = TESTS.find((test) => test.id === 'mock-07')!;
  const store = attempt.useAttemptStore;
  store.getState().start(short);
  assert.equal(store.getState().goto(31), 'locked');
  store.getState().answer(31, 0);
  assert.equal(store.getState().answers[31], undefined);
  for (let n = 21; n <= 30; n++) store.getState().answer(n, 0);
  assert.equal(store.getState().goto(31), 'ok');
  store.getState().clear(21);
  assert.equal(store.getState().goto(32), 'ok');
});

test('only submitted attempts produce results; repeated completion preserves the first score', async () => {
  const store = attempt.useAttemptStore;
  store.getState().start(meta);
  store.getState().answer(1, paper[0].correct);
  await assert.rejects(completion.saveCompletedAttempt(paper));
  store.getState().submit();
  const result = await completion.saveCompletedAttempt(paper)!;
  assert.equal(result.correct, 1);
  assert.equal(result.skipped, paper.length - 1);
  store.getState().answer(1, ((paper[0].correct + 1) % 4) as 0 | 1 | 2 | 3);
  assert.deepEqual(await completion.saveCompletedAttempt(paper, Date.now() + 60_000), result);
  assert.equal(history.useHistoryStore.getState().attempts.length, 1);
  assert.equal(
    completed.useCompletedTestsStore.getState().tests[meta.id].attemptId,
    store.getState().attemptId,
  );
});

test('a different paper cannot be scored against the current attempt', async () => {
  attempt.useAttemptStore.getState().start(meta);
  attempt.useAttemptStore.getState().submit();
  const wrongPaper = paper.map((question, index) =>
    index ? question : { ...question, id: 'wrong-paper' },
  );
  await assert.rejects(completion.saveCompletedAttempt(wrongPaper));
  assert.deepEqual(completed.useCompletedTestsStore.getState().tests, {});
});

test('sign out clears preparation data and identity, and a full wipe removes every stored key', async () => {
  session.useSessionStore.getState().setPhone('9000000001');
  session.useSessionStore.getState().setToken('test-token');
  session.useSessionStore.getState().markWelcomeSeen();
  study.useStudyStore.getState().markRead('percentages');
  attempt.useAttemptStore.getState().start(meta);
  attempt.useAttemptStore.getState().submit();
  await completion.saveCompletedAttempt(paper);
  account.signOut();
  assert.equal(session.useSessionStore.getState().token, undefined);
  assert.equal(session.useSessionStore.getState().seenWelcome, true);
  assert.equal(attempt.useAttemptStore.getState().status, 'idle');
  assert.deepEqual(study.useStudyStore.getState().read, {});
  assert.deepEqual(history.useHistoryStore.getState().attempts, []);
  assert.deepEqual(completed.useCompletedTestsStore.getState().tests, {});
  account.wipeLocalData();
  for (const key of account.ALL_STORAGE_KEYS) assert.equal(memory.has(key), false);
});

test('login return links preserve legacy routes and reject external destinations', () => {
  assert.equal(returnHref('/(tabs)/tests'), '/tests');
  assert.equal(returnHref('/tests/simocktest'), '/tests/simocktest');
  for (const path of [
    'https://evil.invalid',
    '//evil.invalid',
    '/%2fevil.invalid',
    '/\\evil.invalid',
    '/%5cevil.invalid',
    '/%00',
    '/%zz',
  ]) {
    assert.equal(returnHref(path), '/');
  }
});
