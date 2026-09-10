import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { HttpApi } from '../data/api/http';
import { useApiCache } from '../data/apiCache';
import { TESTS, paperForTest } from '../lib/test-catalog';

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  useApiCache.getState().reset();
});

test('catalogue and complete public paper come from HTTP, preserving Telugu and section rules', async () => {
  const meta = TESTS[0];
  const paper = paperForTest(meta).map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    section: q.section,
    avgSeconds: q.avgSeconds,
  }));
  const paths: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    paths.push(url);
    return Response.json(url.endsWith('/catalog') ? TESTS : url.endsWith('/meta') ? meta : paper);
  };
  const api = new HttpApi({ baseUrl: 'https://api.example/api/' });
  assert.equal((await api.listTestMetas()).length, TESTS.length);
  assert.deepEqual(await api.getTestMeta(meta.id), meta);
  assert.deepEqual(await api.getPaper(meta.id), paper);
  assert.deepEqual(paths, [
    'https://api.example/api/v1/tests/catalog',
    `https://api.example/api/v1/tests/${meta.id}/meta`,
    `https://api.example/api/v1/tests/${meta.id}/paper`,
  ]);
  assert.equal('correct' in (await api.getPaper(meta.id))[0], false);
});

test('offline fallback uses downloaded data only; 404 and malformed responses remain errors', async () => {
  const api = new HttpApi({ baseUrl: 'https://api.example/api' });
  globalThis.fetch = async () => Response.json(TESTS);
  const first = await api.listTestMetas();
  globalThis.fetch = async () => {
    throw new TypeError('offline');
  };
  assert.deepEqual(await api.listTestMetas(), first);
  await assert.rejects(api.getPaper('never-downloaded'), { status: 0 });
  globalThis.fetch = async () => new Response('', { status: 404 });
  await assert.rejects(api.listTestMetas(), { status: 404 });
  globalThis.fetch = async () => Response.json([{ id: 'broken' }]);
  await assert.rejects(api.listTestMetas(), { code: 'schema_mismatch' });
});

test('submit sends an atomic final snapshot and review uses the returned result ID', async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ url: String(input), init });
    return Response.json(
      String(input).endsWith('/submit') ? { result_id: 'result-123' } : paperForTest(TESTS[0]),
    );
  };
  const api = new HttpApi({ baseUrl: '/api' });
  const body = { answers: [{ question_id: 'q1', choice: 0, marked: true }], elapsed_seconds: 30 };
  const result = await api.submitAttempt('attempt-123', body);
  await api.getReviewPaper(result.result_id);
  assert.equal(requests[0].init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(requests[0].init?.body)), body);
  assert.equal(requests[1].url, '/api/v1/results/result-123/paper');
});

test('an in-flight download cannot restore cache after device sign-out', async () => {
  let respond!: (response: Response) => void;
  globalThis.fetch = () =>
    new Promise((resolve) => {
      respond = resolve;
    });
  const request = new HttpApi({ baseUrl: '/api' }).listTestMetas();
  useApiCache.getState().reset();
  respond(Response.json(TESTS));
  await request;
  assert.deepEqual(useApiCache.getState().entries, {});
});
