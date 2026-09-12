import { SI_MOCK_01_ID } from '@tslprb/fixtures/src/runtime';
import {
  CONSTABLE_MOCK_01_ID,
  CONSTABLE_MOCK_02_ID,
  CONSTABLE_MOCK_03_ID,
  SI_MOCK_02_ID,
  SI_MOCK_03_ID,
} from './test-ids';

export const attemptHref = (id: string) =>
  id === SI_MOCK_01_ID
    ? '/tests/simocktest'
    : id === SI_MOCK_02_ID
      ? '/tests/simocktest02'
      : id === SI_MOCK_03_ID
        ? '/tests/simocktest03'
        : id === CONSTABLE_MOCK_01_ID
          ? '/test/constablemocktest01'
          : id === CONSTABLE_MOCK_02_ID
            ? '/test/constablemocktest02'
            : id === CONSTABLE_MOCK_03_ID
              ? '/test/constablemocktest03'
              : `/test/${encodeURIComponent(id)}`;
const reviewSlug = (id: string) =>
  id === SI_MOCK_01_ID
    ? 'simocktest'
    : id === CONSTABLE_MOCK_01_ID
      ? 'constablemocktest01'
      : id === CONSTABLE_MOCK_02_ID
        ? 'constablemocktest02'
        : id === CONSTABLE_MOCK_03_ID
          ? 'constablemocktest03'
          : encodeURIComponent(id);
export const resultHref = (id: string) =>
  id === SI_MOCK_03_ID ? '/tests/simocktest03/result' : `/test/${reviewSlug(id)}/result`;
export const solutionsHref = (id: string) =>
  id === CONSTABLE_MOCK_01_ID
    ? '/test/constablemocktest01/solution'
    : id === CONSTABLE_MOCK_02_ID
      ? '/test/constablemocktest02/solution'
      : id === CONSTABLE_MOCK_03_ID
        ? '/test/constablemocktest03/solution'
        : id === SI_MOCK_02_ID
          ? '/tests/simocktest02/solutions'
          : id === SI_MOCK_03_ID
            ? '/tests/simocktest03/solutions'
            : `/test/${reviewSlug(id)}/solutions`;

/** Return destinations stay on this origin, including links saved by the Expo website. */
export function returnHref(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value))
    return '/';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f]/.test(decoded)) return '/';
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid') return '/';
    return value.replace(/^\/\((?:tabs|auth|onboarding)\)(?=\/|$)/, '') || '/';
  } catch {
    return '/';
  }
}

export const withReturn = (page: string, destination: string) =>
  `${page}?returnTo=${encodeURIComponent(returnHref(destination))}`;

/** Old login bookmarks now lead straight to their local destination. */
export function loginReturnHref(value: string | null | undefined): string {
  const destination = returnHref(value || '/tests');
  const pathname = decodeURIComponent(new URL(destination, 'https://local.invalid').pathname);
  return /^\/login(?:\/|$)/.test(pathname) ? '/tests' : destination;
}
