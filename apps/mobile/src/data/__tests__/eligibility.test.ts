import Storage from 'expo-sqlite/kv-store';

import { ELIGIBILITY_STORAGE_KEY, useEligibilityStore } from '../eligibility';

const read = () => useEligibilityStore.getState();

beforeEach(() => {
  read().reset();
});

describe('eligibility store', () => {
  // `undefined` is not the same as a default here: it means "still following my profile", and
  // the screen falls back to the session's post and category while it stays that way.
  it('starts with no picker moved and no measurement taken', () => {
    expect(read().post).toBeUndefined();
    expect(read().gender).toBeUndefined();
    expect(read().group).toBeUndefined();
    expect(read().values).toEqual({});
    expect(read().checked).toBe(false);
  });

  it('records each picker on its own', () => {
    read().setPost('si');
    read().setGender('female');
    read().setGroup('st');
    expect(read()).toMatchObject({ post: 'si', gender: 'female', group: 'st' });
  });

  it('keeps a measurement exactly as typed, half-finished decimals and all', () => {
    read().setValue('height', '167.');
    expect(read().values.height).toBe('167.');
    read().setValue('height', '167.6');
    read().setValue('run800m', '168');
    expect(read().values).toEqual({ height: '167.6', run800m: '168' });
  });

  it('remembers that the answer was asked for', () => {
    expect(read().checked).toBe(false);
    read().check();
    expect(read().checked).toBe(true);
  });

  it('persists under its own key', () => {
    read().setPost('si');
    read().setValue('height', '172');
    read().check();
    const stored = Storage.getItemSync(ELIGIBILITY_STORAGE_KEY);
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string).state).toMatchObject({
      post: 'si',
      values: { height: '172' },
      checked: true,
    });
  });

  it('clears everything on reset', () => {
    read().setPost('si');
    read().setValue('height', '172');
    read().check();
    read().reset();
    expect(read().post).toBeUndefined();
    expect(read().values).toEqual({});
    expect(read().checked).toBe(false);
  });
});
