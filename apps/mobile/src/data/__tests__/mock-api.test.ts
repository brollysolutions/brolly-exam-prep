import {
  AttemptSchema,
  CATEGORY_IDS,
  CategorySchema,
  fromApiCategory,
  toApiCategory,
  PhoneSignInResponseSchema,
  ResultSchema,
  TestSchema,
  TestSummarySchema,
} from '@tslprb/api-contracts';
import { CATEGORIES, FREE_MOCK_SHORT, PWT_CONSTABLE, SAMPLE_RESULT, TESTS } from '@tslprb/fixtures';

import { ApiError, getApi } from '../api';
import { HttpApi } from '../api/http';
import { apportion, MockApi } from '../api/mock';

const api = new MockApi();

describe('MockApi — sign-in', () => {
  it('turns a number into a session, in the contract shape', async () => {
    const res = await api.signInWithPhone({ phone: '9876543210' });
    expect(PhoneSignInResponseSchema.parse(res)).toBeTruthy();
    expect(res.token).toBeTruthy();
    expect(res.user.phone).toBe('9876543210');
  });

  // The OTP step went on 2026-09-07: there is no code to send, to guess or to get wrong, and
  // nothing to fail with. A number that reaches this call always comes back with a session.
  it('gives the same number the same account, and a fresh token each time', async () => {
    const first = await api.signInWithPhone({ phone: '9000000000' });
    const second = await api.signInWithPhone({ phone: '9000000000' });
    expect(first.user.id).toBe(second.user.id);
    expect(first.token).not.toBe(second.token);
  });

  it('gives different numbers different accounts', async () => {
    const one = await api.signInWithPhone({ phone: '9000000001' });
    const two = await api.signInWithPhone({ phone: '9000000002' });
    expect(one.user.id).not.toBe(two.user.id);
  });
});

describe('MockApi — tests', () => {
  it('lists every fixture test as a contract summary', async () => {
    const list = await api.listTests();
    expect(list).toHaveLength(TESTS.length);
    expect(list.map((t) => t.id)).toEqual(TESTS.map((t) => t.id));
    for (const t of list) expect(TestSummarySchema.parse(t)).toBeTruthy();
  });

  it('returns the free mock with its four sections and 40 questions', async () => {
    const test = await api.getTest('mock-07');
    expect(TestSchema.parse(test)).toBeTruthy();
    expect(test.sections).toHaveLength(4);
    expect(test.sections.flatMap((s) => s.questions)).toHaveLength(40);
    expect(test.duration_minutes).toBe(FREE_MOCK_SHORT.durationMinutes);
  });

  it('exposes the app-side test meta with its exam pattern', async () => {
    const meta = await api.getTestMeta('mock-07');
    expect(meta.pattern).toEqual(FREE_MOCK_SHORT);
    expect(meta.pattern.sections[3]).toMatchObject({ id: 'telangana', unlockAfter: 'gs' });
  });

  it('builds a paper with answer keys for the solutions screen', async () => {
    const paper = await api.getPaper('mock-07');
    expect(paper).toHaveLength(40);
    expect(paper[0]).toMatchObject({ section: 'arithmetic' });
    expect(typeof paper[0].correct).toBe('number');
  });

  it('rejects an unknown test id', async () => {
    await expect(api.getTest('nope')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('MockApi — attempts', () => {
  it('starts an attempt ending exactly duration minutes from now', async () => {
    const now = Date.parse('2026-09-02T10:00:00.000Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);
    try {
      const attempt = await api.createAttempt({ test_id: 'mock-07' });
      expect(AttemptSchema.parse(attempt)).toBeTruthy();
      expect(Date.parse(attempt.ends_at) - now).toBe(FREE_MOCK_SHORT.durationMinutes * 60_000);
      expect(Date.parse(attempt.started_at)).toBe(now);
      expect(attempt.status).toBe('in_progress');
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('accepts answer patches and returns a result id on submit', async () => {
    const attempt = await api.createAttempt({ test_id: 'mock-07' });
    const ok = await api.patchAttemptAnswer(attempt.id, { question_id: 'q1', choice: 2 });
    expect(ok.ok).toBe(true);
    const { result_id } = await api.submitAttempt(attempt.id);
    expect(result_id).toBeTruthy();
  });

  it('rejects a patch against an unknown attempt', async () => {
    await expect(
      api.patchAttemptAnswer('nope', { question_id: 'q1', choice: 0 }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('apportion', () => {
  it('splits proportionally and sums to exactly the total', () => {
    const shares = apportion(11, [10, 10, 10, 10]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(11);
    expect(shares).toEqual([3, 3, 3, 2]);
  });

  it('gives the remainder to the largest fractions first', () => {
    const shares = apportion(10, [50, 50, 80, 20]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10);
    expect(shares).toEqual([3, 2, 4, 1]);
  });

  it('is all zeroes for a zero total or zero weights', () => {
    expect(apportion(0, [1, 2, 3])).toEqual([0, 0, 0]);
    expect(apportion(5, [0, 0])).toEqual([0, 0]);
  });
});

describe('MockApi — results', () => {
  const resultFor = async (testId: string) => {
    const attempt = await api.createAttempt({ test_id: testId });
    const { result_id } = await api.submitAttempt(attempt.id);
    return { attempt, result: await api.getResult(result_id) };
  };

  it('returns a contract result for the submitted attempt', async () => {
    const { attempt, result } = await resultFor('mock-07');
    expect(ResultSchema.parse(result)).toBeTruthy();
    expect(result.test_id).toBe('mock-07');
    expect(result.attempt_id).toBe(attempt.id);
    expect(result.rank).toBe(SAMPLE_RESULT.rank);
  });

  // `sec-blood` sat here as the one-section paper until the sectional drills were dropped
  // (2026-09-07); every paper in the bank now carries the four PWT sections, and a
  // previous-year paper takes its place so both kinds are checked.
  it.each(['mock-07', 'mock-08', 'prev-2022'])(
    'is internally coherent for %s: headline == sum of sections',
    async (testId) => {
      const { result } = await resultFor(testId);
      const pattern = TESTS.find((t) => t.id === testId)?.pattern;
      if (!pattern) throw new Error(`no pattern for ${testId}`);

      const sumMarks = result.per_section.reduce((n, s) => n + s.marks, 0);
      expect(result.score).toBeCloseTo(sumMarks, 10);
      expect(result.max_score).toBe(pattern.totalQuestions * pattern.marksPerCorrect);
      expect(result.score).toBeLessThanOrEqual(result.max_score);

      // every question is accounted for exactly once, in its own section
      result.per_section.forEach((s, i) => {
        expect(s.correct + s.wrong + s.skipped).toBe(pattern.sections[i].questions);
        expect(s.correct).toBeGreaterThanOrEqual(0);
      });
      const questions = result.per_section.reduce((n, s) => n + s.correct + s.wrong + s.skipped, 0);
      expect(questions).toBe(pattern.totalQuestions);

      // the qualified flag agrees with the cut-off it is shown next to
      expect(result.cutoff).toBeCloseTo((SAMPLE_RESULT.cutoffPct / 100) * result.max_score, 10);
      expect(result.qualified).toBe(result.score >= result.cutoff);

      // accuracy is correct / attempted, not a fixture percentage
      const correct = result.per_section.reduce((n, s) => n + s.correct, 0);
      const wrong = result.per_section.reduce((n, s) => n + s.wrong, 0);
      expect(result.accuracy).toBeCloseTo(correct / (correct + wrong), 10);
    },
  );

  it('scales the fixture wrong/skipped rates onto the 40-question free mock', async () => {
    const { result } = await resultFor('mock-07');
    const wrong = result.per_section.reduce((n, s) => n + s.wrong, 0);
    const skipped = result.per_section.reduce((n, s) => n + s.skipped, 0);
    // SAMPLE_RESULT is a 100-mark paper with 27 wrong / 6 skipped
    expect(wrong).toBe(Math.round((SAMPLE_RESULT.wrong / SAMPLE_RESULT.maxScore) * 40));
    expect(skipped).toBe(Math.round((SAMPLE_RESULT.skipped / SAMPLE_RESULT.maxScore) * 40));
    expect(result.max_score).toBe(40 * FREE_MOCK_SHORT.marksPerCorrect);
    // accuracy still lands on the fixture's headline 71%
    expect(Math.round(result.accuracy * 100)).toBe(SAMPLE_RESULT.accuracyPct);
  });

  it('scales onto the 200-question official pattern too', async () => {
    const { result } = await resultFor('mock-08');
    expect(result.max_score).toBe(PWT_CONSTABLE.totalQuestions * PWT_CONSTABLE.marksPerCorrect);
    expect(result.per_section).toHaveLength(PWT_CONSTABLE.sections.length);
  });

  it('rejects an unknown result id', async () => {
    await expect(api.getResult('res-nope')).rejects.toBeInstanceOf(ApiError);
  });

  it('returns the SAMPLE_RESULT shape for the analysis screen', async () => {
    const detail = await api.getResultDetail(SAMPLE_RESULT.id);
    expect(detail).toEqual(SAMPLE_RESULT);
    expect(detail.actions).toHaveLength(SAMPLE_RESULT.actions.length);
    // widened, not the fixture's frozen literal: a screen can build its own
    detail.review.push({ questionNo: 99, your: null, seconds: 4 });
    expect(detail.review).toHaveLength(SAMPLE_RESULT.review.length + 1);
  });
});

describe('HttpApi', () => {
  it('constructs and normalises the base url', () => {
    expect(new HttpApi({ baseUrl: 'http://localhost:8000/' })).toBeInstanceOf(HttpApi);
  });

  it('loads catalogue, metadata, and public questions from the server', async () => {
    const meta = TESTS.find((t) => t.id === 'mock-07')!;
    const mock = new MockApi();
    const paper = (await mock.getPaper(meta.id)).map(
      ({ correct: _key, explanation: _why, ...q }) => q,
    );
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => TESTS } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => meta } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => paper } as Response);
    const http = new HttpApi({ baseUrl: 'http://localhost:8000' });
    expect((await http.listTestMetas()).map((t) => t.id)).toEqual(TESTS.map((t) => t.id));
    expect((await http.getTestMeta(meta.id)).pattern).toEqual(meta.pattern);
    expect(await http.getPaper(meta.id)).toEqual(paper);
    expect(fetchSpy.mock.calls.map((call) => call[0])).toEqual([
      'http://localhost:8000/v1/tests/catalog',
      'http://localhost:8000/v1/tests/mock-07/meta',
      'http://localhost:8000/v1/tests/mock-07/paper',
    ]);
    fetchSpy.mockRestore();
  });

  it('requests analysis by result id and does not substitute a sample on failure', async () => {
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: false, status: 404 } as Response);
    const http = new HttpApi({ baseUrl: 'http://localhost:8000' });
    await expect(http.getResultDetail('missing')).rejects.toMatchObject({ status: 404 });
    expect(fetchSpy.mock.calls[0][0]).toBe('http://localhost:8000/v1/results/missing/detail');
    fetchSpy.mockRestore();
  });
});

describe('category spelling', () => {
  it('round-trips every fixture id through the wire spelling', () => {
    for (const id of CATEGORY_IDS) {
      const wire = toApiCategory(id);
      expect(CategorySchema.parse(wire)).toBe(wire);
      expect(fromApiCategory(wire)).toBe(id);
    }
  });

  it('covers every category the contract knows about', () => {
    expect(CATEGORY_IDS.map(toApiCategory).sort()).toEqual([...CategorySchema.options].sort());
  });

  it('agrees with the fixture category list the onboarding grid renders', () => {
    expect([...CATEGORY_IDS]).toEqual(CATEGORIES.map((c) => c.id));
  });
});

describe('getApi', () => {
  it('uses HTTP without a build-time toggle', () => {
    expect(getApi()).toBeInstanceOf(HttpApi);
  });
});
