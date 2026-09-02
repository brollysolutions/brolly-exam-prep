import { useSessionStore } from '../session';
import { HttpApi } from './http';
import { MockApi } from './mock';
import type { AppApi } from './types';

export { HttpApi, type HttpApiOptions } from './http';
export { apportion, DEV_OTP, MockApi } from './mock';
export {
  ApiError,
  type AnswerPatchInput,
  type AppApi,
  type LocalizedCopy,
  type PaperQuestion,
  type ResultAction,
  type ResultDetail,
  type ResultReviewRow,
} from './types';

let instance: AppApi | undefined;

/**
 * The single API adapter the app talks to. `EXPO_PUBLIC_API=http` swaps in the real fetch
 * client; anything else (the default, and every test run) uses the fixture-backed mock.
 */
export function getApi(): AppApi {
  if (!instance) {
    instance =
      process.env.EXPO_PUBLIC_API === 'http'
        ? new HttpApi({ getToken: () => useSessionStore.getState().token })
        : new MockApi();
  }
  return instance;
}

/** Drops the memoised adapter — for tests and for switching backends at runtime. */
export function resetApi(): void {
  instance = undefined;
}
