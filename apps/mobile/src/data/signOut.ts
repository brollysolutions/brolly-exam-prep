import { useSubmissions, SUBMISSIONS_STORAGE_KEY } from './complete';
import { useApiCache, API_CACHE_STORAGE_KEY } from './apiCache';
import { ACTIVITY_STORAGE_KEY, useActivityStore } from './activity';
import { ATTEMPT_STORAGE_KEY, useAttemptStore } from './attempt';
import { COMPLETED_TESTS_STORAGE_KEY, useCompletedTestsStore } from './completedTests';
import { ELIGIBILITY_STORAGE_KEY, useEligibilityStore } from './eligibility';
import { HISTORY_STORAGE_KEY, useHistoryStore } from './history';
import { LANG_STORAGE_KEY, useLangStore } from './lang';
import { SESSION_STORAGE_KEY, useSessionStore } from './session';
import { STUDY_STORAGE_KEY, useStudyStore } from './study';

/**
 * Every key this app writes. The list exists so a store added later cannot quietly reopen the
 * hole this module closed: `storageKeys.test.ts` reads the `tslprb.*` literals out of
 * `src/data` and fails if one of them is missing here.
 */
export const ALL_STORAGE_KEYS = [
  SUBMISSIONS_STORAGE_KEY,
  API_CACHE_STORAGE_KEY,
  SESSION_STORAGE_KEY,
  ATTEMPT_STORAGE_KEY,
  COMPLETED_TESTS_STORAGE_KEY,
  ELIGIBILITY_STORAGE_KEY,
  HISTORY_STORAGE_KEY,
  ACTIVITY_STORAGE_KEY,
  STUDY_STORAGE_KEY,
  LANG_STORAGE_KEY,
] as const;

/** The persisted stores, in the order a wipe should empty them. */
const PERSISTED = [
  useSubmissions,
  useApiCache,
  useSessionStore,
  useAttemptStore,
  useCompletedTestsStore,
  useEligibilityStore,
  useHistoryStore,
  useActivityStore,
  useStudyStore,
  useLangStore,
] as const;

/**
 * The single way to sign out, and the only place that knows the whole of what one person
 * leaves behind on a handset.
 *
 * These phones are shared, and every screen that reads this data is open to a guest, so
 * anything surviving a sign-out is read by the next person as their own: a half-finished
 * attempt would drop them into someone else's running test, the eligibility answers are body
 * measurements, and the history, streak and read marks are a record of a named person's
 * preparation. The rule is that the person goes, not just the token.
 *
 * This module sits above the stores rather than inside `session.logout()` so that no store
 * imports another; it is the one place allowed to know about all of them at once.
 *
 * Two things survive, both facts about the handset rather than the person: the language it is
 * read in, and `seenWelcome` (kept by `logout()` itself), since the slides have still been seen.
 *
 * Resets only — never `removeItem`. Each reset writes its default straight back through the
 * persist middleware, which is what keeps `seenWelcome` on disk; deleting the session key
 * instead would replay the welcome slides on the next cold boot.
 */
export function signOut(): void {
  useSubmissions.getState().reset();
  useApiCache.getState().reset();
  useSessionStore.getState().logout();
  useAttemptStore.getState().reset();
  useCompletedTestsStore.getState().reset();
  useEligibilityStore.getState().reset();
  useHistoryStore.getState().reset();
  useActivityStore.getState().reset();
  useStudyStore.getState().reset();
}

/**
 * "Delete everything", from the profile screen: what `signOut()` clears plus the two things it
 * keeps, leaving the app as it was the day it was installed — welcome slides, in English.
 *
 * Order matters. The resets run first and the keys are removed afterwards, because every reset
 * writes through the persist middleware: clearing the keys first would simply recreate them.
 *
 * It deletes nothing on a server, because there is no account on a server yet — the API answers
 * every route from in-memory fixtures and its tables are empty. This wipes the handset; the
 * deletion endpoint lands with the database.
 */
export function wipeLocalData(): void {
  signOut();
  useSessionStore.getState().wipe();
  useLangStore.getState().reset();
  for (const store of PERSISTED) void store.persist.clearStorage();
}
