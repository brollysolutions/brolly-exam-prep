import Storage from 'expo-sqlite/kv-store';

import { SESSION_STORAGE_KEY, useSessionStore } from '../session';

const read = () => useSessionStore.getState();

beforeEach(() => {
  read().logout();
});

describe('session store', () => {
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
    read().setToken('tok-1');
    read().setPost('si');
    read().setCategory('bc');
    read().completeOnboarding();
    expect(read()).toMatchObject({
      phone: '9876543210',
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
    read().setToken('tok-1');
    read().setPost('pc');
    read().setCategory('sc');
    read().completeOnboarding();

    read().logout();

    expect(read()).toMatchObject({
      phone: undefined,
      token: undefined,
      post: undefined,
      category: undefined,
      onboarded: false,
    });
    expect(read().signedIn()).toBe(false);
  });

  it('persists through the shared kv storage', () => {
    read().setPost('si');
    const raw = Storage.getItemSync(SESSION_STORAGE_KEY);
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw as string).state.post).toBe('si');
  });
});
