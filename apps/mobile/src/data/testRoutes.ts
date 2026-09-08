import { isImportedTest, SI_MOCK_01_ID } from '@tslprb/fixtures';
import type { ReturnTarget } from './href';

export const SI_MOCK_ATTEMPT_PATH = '/tests/simocktest';
export const SI_MOCK_SLUG = 'simocktest';

/** Resolve a public review slug before reading saved results or checking submission. */
export const testIdFromRoute = (id: string): string => (id === SI_MOCK_SLUG ? SI_MOCK_01_ID : id);

const reviewSlug = (id: string): string => (isImportedTest(id) ? SI_MOCK_SLUG : id);

export const testResultHref = (id: string): ReturnTarget => `/test/${reviewSlug(id)}/result`;
export const testSolutionsHref = (id: string): ReturnTarget => `/test/${reviewSlug(id)}/solutions`;

/** Public URLs are separate from persistent paper/attempt IDs. */
export const testAttemptHref = (id: string): ReturnTarget =>
  isImportedTest(id) ? SI_MOCK_ATTEMPT_PATH : `/test/${id}`;
