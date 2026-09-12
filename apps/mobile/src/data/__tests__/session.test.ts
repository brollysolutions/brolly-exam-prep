import Storage from 'expo-sqlite/kv-store';

import {
  backendToken,
  hasBackendIdentity,
  offlineUserId,
  SESSION_STORAGE_KEY,
  useSessionStore,
} from '../session';

const read = () => useSessionStore.getState();

beforeEach(() => {
  read().logout();
});

describe('session store', () => {
  it('keeps dummy login local and clears the previous backend identity', () => {
    read().setUserId('previous-user');
    read().setToken('previous-token');
    read().setPost('si');
    read().startTestingSession('0000000000');
    expect(read().signedIn()).toBe(true);
    expect(read().userId).toBeUndefined();
    expect(read().post).toBeUndefined();
    expect(offlineUserId(read())).toBe('phone:0000000000');
    expect(backendToken(read())).toBeUndefined();
    expect(hasBackendIdentity(read())).toBe(false);
    expect(hasBackendIdentity({ ...read(), userId: 'stale-user' })).toBe(false);
  });

  it.each(['123456789', '12345678901', 'abcdefghij'])('rejects invalid test login %s', (phone) => {
    expect(() => read().startTestingSession(phone)).toThrow('Enter exactly 10 digits');
    expect(read().signedIn()).toBe(false);
  });
  it('starts signed out and un-onboarded', () => {
    expect(read()).toMatchObject({
      phone: undefined,
      token: undefined,
      post: undefined,
      category: undefined,
      onboarded: false,
    });
  });

  it('records the onboarding answers', () => {
    read().setPhone('9876543210');
    read().setUserId('user-1');
    read().setToken('tok-1');
    read().setPost('si');
    read().setCategory('bc');
    read().completeOnboarding();
    expect(read()).toMatchObject({
      phone: '9876543210',
      userId: 'user-1',
      token: 'tok-1',
      post: 'si',
      category: 'bc',
      onboarded: true,
    });
  });

  it('exposes signedIn only once a token is held', () => {
    expect(read().signedIn()).toBe(false);
    read().setToken('tok-1');
    expect(read().signedIn()).toBe(true);
  });

  it('logout resets identity and onboarding answers', () => {
    read().setPhone('9876543210');
    read().setUserId('user-1');
    read().setToken('tok-1');
    read().setPost('pc');
    read().setCategory('sc');
    read().completeOnboarding();

    read().logout();

    expect(read()).toMatchObject({
      phone: undefined,
      userId: undefined,
      token: undefined,
      post: undefined,
      category: undefined,
      onboarded: false,
    });
    expect(read().signedIn()).toBe(false);
  });

  it('treats only a userId + token session as a backend identity', () => {
    // A phone-only (legacy/degraded) session is NOT a backend identity: it may play and store
    // locally but must never drive a server attempt create/submit.
    expect(hasBackendIdentity({ ...read(), phone: '2222222222', token: 'tok-1' })).toBe(false);
    expect(offlineUserId({ ...read(), phone: '2222222222', token: 'tok-1' })).toBe(
      'phone:2222222222',
    );
    // A token with no userId is still not a backend identity.
    expect(hasBackendIdentity({ ...read(), token: 'tok-1' })).toBe(false);
    // A userId with no token is not yet authenticated.
    expect(hasBackendIdentity({ ...read(), userId: 'user-1' })).toBe(false);
    // Only both together qualify, and the scope key is the stable user form.
    expect(hasBackendIdentity({ ...read(), userId: 'user-1', token: 'tok-1' })).toBe(true);
    expect(offlineUserId({ ...read(), userId: 'user-1', token: 'tok-1' })).toBe('user:user-1');
  });

  it('persists through the shared kv storage', () => {
    read().setPost('si');
    const raw = Storage.getItemSync(SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).state.post).toBe('si');
  });
});
