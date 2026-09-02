import {
  AttemptSchema,
  OtpRequestResponseSchema,
  OtpVerifyResponseSchema,
  ResultSchema,
  TestSchema,
  TestSummarySchema,
} from '@tslprb/api-contracts';
import { FREE_MOCK_SHORT, SAMPLE_RESULT, TESTS } from '@tslprb/fixtures';

import { ApiError, getApi } from '../api';
import { MockApi } from '../api/mock';

const api = new MockApi();

describe('MockApi — OTP', () => {
  it('issues a request id and exposes the dev code', async () => {
    const res = await api.requestOtp({ phone: '9876543210' });
    expect(OtpRequestResponseSchema.parse(res)).toBeTruthy();
    expect(res.dev_code).toBe('123456');
  });

  it('accepts the dev code 123456 for any phone', async () => {
    const { request_id } = await api.requestOtp({ phone: '9000000000' });
    const res = await api.verifyOtp({ request_id, code: '123456' });
    expect(OtpVerifyResponseSchema.parse(res)).toBeTruthy();
    expect(res.token).toBeTruthy();
    expect(res.user.phone).toBe('9000000000');
  });

  it('rejects any other code', async () => {
    const { request_id } = await api.requestOtp({ phone: '9000000000' });
    await expect(api.verifyOtp({ request_id, code: '000000' })).rejects.toBeInstanceOf(ApiError);
  });

  it('rejects an unknown request id', async () => {
    await expect(api.verifyOtp({ request_id: 'nope', code: '123456' })).rejects.toBeInstanceOf(
      ApiError,
    );
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
    const ok = await api.patchAttemptAnswer(attempt.id, { question_id: 'q1', choice: 2, marked: false });
    expect(ok.ok).toBe(true);
    const { result_id } = await api.submitAttempt(attempt.id);
    expect(result_id).toBeTruthy();
  });

  it('rejects a patch against an unknown attempt', async () => {
    await expect(
      api.patchAttemptAnswer('nope', { question_id: 'q1', choice: 0, marked: false }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe('MockApi — results', () => {
  it('returns a contract result derived from SAMPLE_RESULT', async () => {
    const attempt = await api.createAttempt({ test_id: 'mock-07' });
    const { result_id } = await api.submitAttempt(attempt.id);
    const result = await api.getResult(result_id);
    expect(ResultSchema.parse(result)).toBeTruthy();
    expect(result.score).toBe(SAMPLE_RESULT.score);
    expect(result.max_score).toBe(SAMPLE_RESULT.maxScore);
    expect(result.qualified).toBe(SAMPLE_RESULT.qualified);
    expect(result.rank).toBe(SAMPLE_RESULT.rank);
    expect(result.attempt_id).toBe(attempt.id);
  });

  it('returns the SAMPLE_RESULT shape for the analysis screen', async () => {
    const detail = await api.getResultDetail(SAMPLE_RESULT.id);
    expect(detail).toEqual(SAMPLE_RESULT);
  });
});

describe('getApi', () => {
  it('returns MockApi unless EXPO_PUBLIC_API is http', () => {
    expect(getApi()).toBeInstanceOf(MockApi);
  });
});
