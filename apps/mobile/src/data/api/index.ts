import { HttpApi } from './http';
import { MockApi } from './mock';
import type { AppApi } from './types';

export { HttpApi } from './http';
export { DEV_OTP, MockApi } from './mock';
export { ApiError, type AppApi, type PaperQuestion, type ResultDetail } from './types';

let instance: AppApi | undefined;

/**
 * The single API adapter the app talks to. `EXPO_PUBLIC_API=http` swaps in the real fetch
 * client; anything else (the default, and every test run) uses the fixture-backed mock.
 */
export function getApi(): AppApi {
  if (!instance) {
    instance = process.env.EXPO_PUBLIC_API === 'http' ? new HttpApi() : new MockApi();
  }
  return instance;
}

/** Drops the memoised adapter — for tests and for switching backends at runtime. */
export function resetApi(): void {
  instance = undefined;
}
