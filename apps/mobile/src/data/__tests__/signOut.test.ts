import { TESTS, type TestMeta } from '@tslprb/fixtures';
import { initI18n } from '@tslprb/i18n';

import { useActivityStore } from '../activity';
import { useAttemptStore } from '../attempt';
import { useEligibilityStore } from '../eligibility';
import { useHistoryStore } from '../history';
import { useLangStore } from '../lang';
import { useSessionStore } from '../session';
import { signOut, wipeLocalData } from '../signOut';
import { useStudyStore } from '../study';

const FREE_MOCK = TESTS.find((t) => t.id === 'mock-07') as TestMeta;

/**
 * Everything one person leaves behind on a handset. Seeded whole before each destructive
 * call so a store that quietly stops being cleared fails a test rather than a candidate.
 */
function seedOnePerson(): void {
  const session = useSessionStore.getState();
  session.setPhone('9876543210');
  session.setToken('tok-1');
  session.setPost('pc');
  session.setCategory('sc');
  session.completeOnboarding();
  session.markWelcomeSeen();

  useAttemptStore.getState().start(FREE_MOCK);
  useAttemptStore.getState().answer(1, 2);
  useAttemptStore.getState().toggleMark(3);

  // The body measurements: the sharpest thing to inherit from a stranger.
  const eligibility = useEligibilityStore.getState();
  eligibility.setPost('pc');
  eligibility.setGender('female');
  eligibility.setValue('height', '160');
  eligibility.check();

  useHistoryStore.getState().record({
    id: 'att-1',
    testId: 'mock-07',
    score: 30,
    maxScore: 40,
    at: Date.now(),
  });
  useActivityStore.getState().bump('answered');
  useStudyStore.getState().markRead('st-re-blood');

  // setState, not setLang: setLang also drives i18next, which no store test boots.
  useLangStore.setState({ lang: 'te' });
}

/**
 * The wipe returns the app to English through `setLang`, which drives i18next, so this store
 * test boots i18n where it used to be able to avoid it.
 */
beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  wipeLocalData();
  useLangStore.setState({ lang: 'en' });
});

afterAll(() => {
  wipeLocalData();
  useLangStore.setState({ lang: 'en' });
});

describe('signOut', () => {
  it('clears the session and the running attempt together', () => {
    seedOnePerson();
    expect(useAttemptStore.getState().status).toBe('running');

    signOut();

    expect(useSessionStore.getState()).toMatchObject({
      phone: undefined,
      token: undefined,
      post: undefined,
      category: undefined,
      onboarded: false,
    });
    expect(useSessionStore.getState().signedIn()).toBe(false);

    const attempt = useAttemptStore.getState();
    expect(attempt.status).toBe('idle');
    expect(attempt.attemptId).toBeUndefined();
    expect(attempt.endsAt).toBeUndefined();
    expect(attempt.pattern).toBeUndefined();
    expect(attempt.answers).toEqual({});
    expect(attempt.marked).toEqual({});
    expect(attempt.visited).toEqual({});
  });

  /**
   * The handset is shared, so the person is what a sign-out erases. A measurement, a score
   * and a streak all say something about whoever typed them, and the screens that show them
   * are ungated — the next person would read them as their own.
   */
  it('erases the eligibility answers, including the body measurements', () => {
    seedOnePerson();

    signOut();

    const eligibility = useEligibilityStore.getState();
    expect(eligibility.values).toEqual({});
    expect(eligibility.gender).toBeUndefined();
    expect(eligibility.checked).toBe(false);
  });

  it('erases the practice record: past papers, best score, streak and read topics', () => {
    seedOnePerson();

    signOut();

    expect(useHistoryStore.getState().attempts).toEqual([]);
    expect(useActivityStore.getState().byDay).toEqual({});
    expect(useStudyStore.getState().read).toEqual({});
  });

  it('keeps the language preference — it belongs to the handset, not the account', () => {
    useLangStore.setState({ lang: 'te' });
    signOut();
    expect(useLangStore.getState().lang).toBe('te');
  });

  /** The welcome screen is a fact about the handset: a second person has still seen it. */
  it('keeps the welcome-seen flag', () => {
    seedOnePerson();
    signOut();
    expect(useSessionStore.getState().seenWelcome).toBe(true);
  });

  it('is safe to call when nothing is signed in', () => {
    expect(() => signOut()).not.toThrow();
    expect(useAttemptStore.getState().status).toBe('idle');
  });
});

describe('wipeLocalData', () => {
  /**
   * What "Delete everything" has to mean while there is no account on a server to delete:
   * the handset goes back to how it left the shop, language and welcome flag included.
   */
  it('clears everything a sign-out clears, and the handset settings too', () => {
    seedOnePerson();

    wipeLocalData();

    expect(useSessionStore.getState().signedIn()).toBe(false);
    expect(useSessionStore.getState().seenWelcome).toBe(false);
    expect(useAttemptStore.getState().status).toBe('idle');
    expect(useEligibilityStore.getState().values).toEqual({});
    expect(useEligibilityStore.getState().checked).toBe(false);
    expect(useHistoryStore.getState().attempts).toEqual([]);
    expect(useActivityStore.getState().byDay).toEqual({});
    expect(useStudyStore.getState().read).toEqual({});
    expect(useLangStore.getState().lang).toBe('en');
  });

  it('is safe to call twice', () => {
    seedOnePerson();
    wipeLocalData();
    expect(() => wipeLocalData()).not.toThrow();
    expect(useLangStore.getState().lang).toBe('en');
  });
});
