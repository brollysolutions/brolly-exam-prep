import { SI_MOCK_01_ID } from '@tslprb/fixtures';

import { testAttemptHref, testIdFromRoute, testResultHref, testSolutionsHref } from '../testRoutes';

it('uses the requested SI attempt and review URLs without changing the stored test ID', () => {
  expect(testAttemptHref(SI_MOCK_01_ID)).toBe('/tests/simocktest');
  expect(testResultHref(SI_MOCK_01_ID)).toBe('/test/simocktest/result');
  expect(testSolutionsHref(SI_MOCK_01_ID)).toBe('/test/simocktest/solutions');
  expect(testIdFromRoute('simocktest')).toBe(SI_MOCK_01_ID);
  expect(testIdFromRoute(SI_MOCK_01_ID)).toBe(SI_MOCK_01_ID);
});

it.each(['mock-07', 'mock-08', 'prev-2022'])('leaves %s URLs and identifiers unchanged', (id) => {
  expect(testAttemptHref(id)).toBe(`/test/${id}`);
  expect(testResultHref(id)).toBe(`/test/${id}/result`);
  expect(testSolutionsHref(id)).toBe(`/test/${id}/solutions`);
  expect(testIdFromRoute(id)).toBe(id);
});
