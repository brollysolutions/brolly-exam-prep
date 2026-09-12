import * as fixtureContent from '@tslprb/fixtures';
import { AppContentSchema } from '@tslprb/api-contracts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import {
  PathnameContext,
  SearchParamsContext,
} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import { I18nextProvider } from 'react-i18next';
import { initI18n } from '../lib/i18n';
import { loginReturnHref } from '../lib/routes';
import {
  CONSTABLE_MOCK_01_ID,
  CONSTABLE_MOCK_02_ID,
  SI_MOCK_02_ID,
  SI_MOCK_03_ID,
} from '../lib/test-ids';
import { SI_MOCK_01_ID } from '@tslprb/fixtures';
import { Exam, Results } from '../components/exam';
import { Onboarding, Profile } from '../components/screens';
import Website from '../components/website';
import { setCatalog, setContent } from '@tslprb/fixtures/src/runtime';
import { TESTS } from '../lib/test-catalog';
setCatalog(TESTS);
const f = fixtureContent;
setContent(
  AppContentSchema.parse({
    studySections: f.STUDY_SECTIONS,
    notices: f.NOTICES,
    affairs: f.AFFAIRS,
    examInfo: f.EXAM_INFO,
    categories: f.CATEGORIES,
    patterns: { pc: f.PWT_CONSTABLE, si: f.PWT_SI, short: f.FREE_MOCK_SHORT },
    physicalStandards: f.PHYSICAL_STANDARDS,
    standardsNotificationYear: f.STANDARDS_NOTIFICATION_YEAR,
    costRows: f.COST_ROWS,
  }),
);

const unexpectedNavigation = () => {
  throw new Error('Unexpected navigation during guest rendering');
};
const router = {
  back: unexpectedNavigation,
  forward: unexpectedNavigation,
  refresh: unexpectedNavigation,
  hmrRefresh: unexpectedNavigation,
  push: unexpectedNavigation,
  replace: unexpectedNavigation,
  prefetch: async () => undefined,
};

function renderGuest(content: ReactNode) {
  return renderToStaticMarkup(
    createElement(
      AppRouterContext.Provider,
      { value: router },
      createElement(
        PathnameContext.Provider,
        { value: '/tests' },
        createElement(
          SearchParamsContext.Provider,
          { value: new URLSearchParams() },
          createElement(I18nextProvider, { i18n: initI18n('en') }, content),
        ),
      ),
    ),
  );
}

test('anonymous visitors reach each imported exam without a phone or onboarding gate', () => {
  for (const id of [
    SI_MOCK_01_ID,
    SI_MOCK_02_ID,
    SI_MOCK_03_ID,
    CONSTABLE_MOCK_01_ID,
    CONSTABLE_MOCK_02_ID,
  ]) {
    const html = renderGuest(createElement(Exam, { id }));
    assert.match(html, /Loading your paper/);
    assert.doesNotMatch(html, /Sign in|Your phone number|href="\/login/);
  }
});

test('guest results load without authentication and do not expose answers before loading', () => {
  const html = renderGuest(createElement(Results, { id: CONSTABLE_MOCK_01_ID, solutions: true }));
  assert.match(html, /Loading result/);
  assert.doesNotMatch(html, /Correct Answer|Sign in|Your phone number/);
});

test('profile and optional preferences render for guests without sign-in or logout controls', () => {
  const profile = renderGuest(createElement(Profile));
  assert.match(profile, /Practice preferences/);
  assert.match(profile, /Practice history/);
  assert.doesNotMatch(profile, /href="\/login|Sign in|Log out|Your phone number/);
  for (const step of ['post', 'category'] as const) {
    assert.match(renderGuest(createElement(Onboarding, { step })), /<fieldset>/);
  }
});

test('website navigation has no login link for an anonymous visitor', () => {
  const html = renderGuest(createElement(Website, { route: 'tests' }));
  assert.match(html, /Loading tests/);
  assert.doesNotMatch(html, /href="\/login|Sign in/);
});

test('retired login URLs preserve the requested test while preventing redirect loops and external redirects', () => {
  assert.equal(loginReturnHref(undefined), '/tests');
  assert.equal(loginReturnHref('/tests/simocktest'), '/tests/simocktest');
  assert.equal(
    loginReturnHref('/test/constablemocktest01/solution'),
    '/test/constablemocktest01/solution',
  );
  for (const path of ['/login', '/login?returnTo=/tests', '/%6cogin', '/(auth)/login']) {
    assert.equal(loginReturnHref(path), '/tests');
  }
  for (const path of ['https://example.com', '//example.com', '/%2fexample.com', '/%zz']) {
    assert.equal(loginReturnHref(path), '/');
  }
});
