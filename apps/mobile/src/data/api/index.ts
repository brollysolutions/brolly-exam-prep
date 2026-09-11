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
  type ReviewPaperQuestion,
  type ResultAction,
  type ResultDetail,
  type ResultReviewRow,
} from './types';
export { mapPaperQuestion, mapResultDetail, mapReviewQuestion, mapTestMeta } from './mappers';

let instance: AppApi | undefined;

/** The mobile app uses the remote API without bundled demo content. */
export function getApi(): AppApi {
  if (!instance) {
    instance = new HttpApi({ getToken: () => useSessionStore.getState().token });
  }
  return instance;
}

/** Drops the memoised adapter — for tests and for switching backends at runtime. */
export function resetApi(): void {
  instance = undefined;
}
