import { TESTS } from '@tslprb/fixtures';
import { HttpApi } from '../api/http';
import { useApiCache } from '../apiCache';

const response = (json: () => Promise<unknown>) => ({ ok: true, status: 200, json }) as Response;
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
  useApiCache.getState().reset();
});

it('uses downloaded data when the connection drops during the response body', async () => {
  const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(async () => TESTS));
  const api = new HttpApi({ baseUrl: 'https://test.example/api' });
  const downloaded = await api.listTestMetas();
  fetch.mockResolvedValue(
    response(async () => {
      throw new TypeError('connection lost');
    }),
  );
  await expect(api.listTestMetas()).resolves.toEqual(downloaded);
  fetch.mockResolvedValue(
    response(async () => {
      throw new SyntaxError('not JSON');
    }),
  );
  await expect(api.listTestMetas()).rejects.toMatchObject({ code: 'schema_mismatch' });
});

it('keeps the timeout armed until the body finishes downloading', async () => {
  jest.useFakeTimers();
  jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) =>
    response(
      () =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('download timed out')));
        }),
    ),
  );
  const request = new HttpApi().listTestMetas();
  const check = expect(request).rejects.toMatchObject({ status: 0, code: 'network_error' });
  await jest.advanceTimersByTimeAsync(20_000);
  await check;
});
