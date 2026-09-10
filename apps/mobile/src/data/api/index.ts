import { useSessionStore } from '../session';
import { HttpApi } from './http';
import type { AppApi } from './types';

export { HttpApi, type HttpApiOptions } from './http';
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

/** Production always uses the server; tests can instantiate MockApi explicitly. */
export function getApi(): AppApi {
  instance ??= new HttpApi({ getToken: () => useSessionStore.getState().token });
  return instance;
}

/** Drops the memoised adapter — for tests and for switching backends at runtime. */
export function resetApi(): void {
  instance = undefined;
}
