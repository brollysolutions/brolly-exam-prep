import { HttpApi } from '../api/http';

jest.unmock('@/data/api');

const meta = {
  id: 'test-1',
  kind: 'full' as const,
  title: { en: 'Mock 1', te: 'మాక్ 1' },
  pattern: {
    id: 'pattern-1',
    post: 'si' as const,
    total_questions: 1,
    duration_minutes: 60,
    marks_per_correct: 1,
    negative_per_wrong: 0.25,
    qualifying_only: false,
    sections: [
      {
        id: 'arithmetic',
        label_key: 'test.sections.arithmetic',
        questions: 1,
        unlock_after: null,
      },
    ],
    verified: true,
    source: 'test',
  },
  full_mocks_only: false,
  listed: true,
  free: true,
  attempted: null,
};

const paper = {
  id: 'q-1',
  section: 'arithmetic',
  text: { en: 'One plus one?', te: 'ఒకటి మరియు ఒకటి?' },
  options: { en: ['1', '2', '3', '4'], te: ['1', '2', '3', '4'] },
  avg_seconds: 30,
};

const attempt = {
  id: 'attempt-1',
  test_id: 'test-1',
  started_at: '2026-09-10T10:00:00.000Z',
  ends_at: '2026-09-10T11:00:00.000Z',
  status: 'in_progress' as const,
};

const content = {
  version: '2026-09-10',
  notices: [],
  affairs: [],
  study_sections: [],
  exam_info: { pwt_date: '2026-10-18', label: { en: 'PWT', te: 'PWT' } },
  categories: [],
  cost_rows: { en: [], te: [] },
  physical_standards: [],
  standards_notification_year: 2022,
};

const resultDetail = {
  id: 'result-1',
  test_title_n: 1,
  title: meta.title,
  score: 1,
  max_score: 1,
  cutoff_pct: 40,
  qualified: true,
  rank: null,
  total_candidates: null,
  accuracy_pct: 100,
  avg_seconds_per_question: 20,
  negative_marks: 0,
  correct: 1,
  wrong: 0,
  skipped: 0,
  actions: [],
  review: [{ question_no: 1, your: 1, seconds: 20 }],
};

const reviewPaper = {
  ...paper,
  your_choice: 1,
  marked: false,
  correct_choice: 1,
  explanation: { en: '1 + 1 = 2', te: '1 + 1 = 2' },
  seconds: 20,
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('HttpApi FastAPI v0.2 integration', () => {
  it('ignores a developer LAN address in a release build', async () => {
    const globals = globalThis as typeof globalThis & { __DEV__: boolean };
    const previousDev = globals.__DEV__;
    const previousUrl = process.env.EXPO_PUBLIC_API_URL;
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ status: 'ok' }));
    try {
      globals.__DEV__ = false;
      process.env.EXPO_PUBLIC_API_URL = 'http://192.168.0.120:8000';
      await new HttpApi().health();
      expect(fetchMock).toHaveBeenCalledWith(
        'https://mocktest.brollyexamprep.com/api/health',
        expect.any(Object),
      );
    } finally {
      globals.__DEV__ = previousDev;
      if (previousUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
      else process.env.EXPO_PUBLIC_API_URL = previousUrl;
    }
  });

  afterEach(() => jest.restoreAllMocks());

  it('uses every catalog/content/attempt/result endpoint with centralized mapping', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const path = new URL(String(input)).pathname;
      const method = init?.method ?? 'GET';
      if (path === '/api/v1/content') return response(content);
      if (path === '/api/v1/tests/catalog') return response([meta]);
      if (path === '/api/v1/tests/test-1/meta') return response(meta);
      if (path === '/api/v1/tests/test-1/paper') return response([paper]);
      if (path === '/api/v1/attempts' && method === 'POST') return response(attempt);
      if (path === '/api/v1/attempts/attempt-1/answers' && method === 'PATCH')
        return response({ ok: true });
      if (path === '/api/v1/attempts/attempt-1/submit' && method === 'POST')
        return response({ result_id: 'result-1' });
      if (path === '/api/v1/attempts/attempt-1')
        return response({ ...attempt, answers: [{ question_id: 'q-1', choice: 1, marked: false }] });
      if (path === '/api/v1/attempts/attempt-1/meta') return response(meta);
      if (path === '/api/v1/attempts/attempt-1/paper') return response([paper]);
      if (path === '/api/v1/results/result-1/detail') return response(resultDetail);
      if (path === '/api/v1/results/result-1/paper') return response([reviewPaper]);
      throw new Error(`Unexpected ${method} ${path}`);
    });
    const api = new HttpApi({
      baseUrl: 'https://api.example/api/',
      getToken: () => 'user-token',
    });

    await expect(api.getContent()).resolves.toEqual(content);
    await expect(api.listTestMetas()).resolves.toMatchObject([{ id: 'test-1' }]);
    await expect(api.getTestMeta('test-1')).resolves.toMatchObject({
      pattern: { totalQuestions: 1 },
    });
    const publicPaper = await api.getPaper('test-1');
    expect(publicPaper[0]).not.toHaveProperty('correct');
    expect(publicPaper[0]).not.toHaveProperty('explanation');

    const created = await api.createAttempt({ test_id: 'test-1' });
    await expect(api.getAttempt(created.id)).resolves.toMatchObject({
      id: 'attempt-1',
      answers: [{ question_id: 'q-1', choice: 1 }],
    });
    await expect(api.getAttemptMetaData(created.id)).resolves.toMatchObject({ id: 'test-1' });
    await expect(api.getAttemptPaperData(created.id)).resolves.toHaveLength(1);
    await expect(
      api.patchAttemptAnswer(created.id, { question_id: 'q-1', choice: 1, marked: false }),
    ).resolves.toEqual({ ok: true });

    const submitted = await api.submitAttempt(created.id);
    expect(submitted.result_id).toBe('result-1');
    await expect(api.getResultDetail(submitted.result_id)).resolves.toMatchObject({
      id: 'result-1',
      score: 1,
    });
    await expect(api.getReviewPaper(submitted.result_id)).resolves.toMatchObject([
      { id: 'q-1', yourChoice: 1, correct: 1, explanation: reviewPaper.explanation },
    ]);

    for (const call of fetchMock.mock.calls) {
      expect(call[1]?.headers).toMatchObject({ Authorization: 'Bearer user-token' });
    }
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual(
      expect.arrayContaining([
        'https://api.example/api/v1/tests/catalog',
        'https://api.example/api/v1/attempts/attempt-1/meta',
        'https://api.example/api/v1/results/result-1/detail',
        'https://api.example/api/v1/results/result-1/paper',
      ]),
    );
  });

  it('preserves unauthorized status for result authorization handling', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(response({ detail: 'Unauthorized' }, 401));
    const api = new HttpApi({ baseUrl: 'https://api.example/api' });

    await expect(api.getResultDetail('result-1')).rejects.toMatchObject({
      status: 401,
      code: 'http_error',
    });
    await expect(api.getReviewPaper('result-1')).rejects.toMatchObject({
      status: 401,
      code: 'http_error',
    });
  });

  it('rejects fixture-shaped papers instead of weakening four-option validation', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      response([{ ...paper, options: { en: ['1', '2', '3'], te: ['1', '2', '3'] } }]),
    );
    const api = new HttpApi({ baseUrl: 'https://api.example/api' });

    await expect(api.getPaper('test-1')).rejects.toMatchObject({
      status: 200,
      code: 'schema_mismatch',
    });
  });
});
