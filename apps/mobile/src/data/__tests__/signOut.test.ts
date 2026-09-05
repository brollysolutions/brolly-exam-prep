import { TESTS, type TestMeta } from '@tslprb/fixtures';

import { useAttemptStore } from '../attempt';
import { useLangStore } from '../lang';
import { useSessionStore } from '../session';
import { signOut } from '../signOut';

const FREE_MOCK = TESTS.find((t) => t.id === 'mock-07') as TestMeta;

describe('signOut', () => {
  beforeEach(() => {
    useSessionStore.getState().logout();
    useAttemptStore.getState().reset();
  });

  it('clears the session and the running attempt together', () => {
    const session = useSessionStore.getState();
    session.setPhone('9876543210');
    session.setToken('tok-1');
    session.setPost('pc');
    session.setCategory('sc');
    session.completeOnboarding();

    useAttemptStore.getState().start(FREE_MOCK);
    useAttemptStore.getState().answer(1, 2);
    useAttemptStore.getState().toggleMark(3);
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

  it('keeps the language preference — it belongs to the handset, not the account', () => {
    // setState, not setLang: setLang also drives i18next, which no store test boots.
    useLangStore.setState({ lang: 'te' });
    signOut();
    expect(useLangStore.getState().lang).toBe('te');
    useLangStore.setState({ lang: 'en' });
  });

  it('is safe to call when nothing is signed in', () => {
    expect(() => signOut()).not.toThrow();
    expect(useAttemptStore.getState().status).toBe('idle');
  });
});
