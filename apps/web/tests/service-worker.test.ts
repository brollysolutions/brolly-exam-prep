import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

type Event = {
  request: { method: string; url: string; mode: string };
  respondWith: (response: Promise<Response>) => void;
};
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(failure: 'open' | 'put') {
  let fetchHandler!: (event: Event) => void;
  runInNewContext(source, {
    URL,
    Response,
    self: {
      location: { origin: 'https://test.example' },
      addEventListener: (name: string, handler: typeof fetchHandler) => {
        if (name === 'fetch') fetchHandler = handler;
      },
    },
    fetch: async () => new Response('live response'),
    caches: {
      open: async () => {
        if (failure === 'open') throw new Error('cache blocked');
        return {
          match: async () => undefined,
          put: async () => {
            throw new Error('quota exceeded');
          },
        };
      },
    },
  });
  return (path: string, mode: string) => {
    let result: Promise<Response> | undefined;
    fetchHandler({
      request: { method: 'GET', url: `https://test.example${path}`, mode },
      respondWith: (response) => {
        result = response;
      },
    });
    return result;
  };
}

for (const failure of ['open', 'put'] as const) {
  test(`online pages and assets still load when cache ${failure} fails`, async () => {
    const request = worker(failure);
    assert.equal(await (await request('/tests', 'navigate'))?.text(), 'live response');
    assert.equal(await (await request('/_next/static/chunk.js', 'cors'))?.text(), 'live response');
  });
}
test('API and schema navigation bypass the offline page cache', () => {
  const request = worker('open');
  for (const path of ['/api', '/api/health', '/api/openapi.json', '/openapi.json']) {
    assert.equal(request(path, 'navigate'), undefined);
  }
});
