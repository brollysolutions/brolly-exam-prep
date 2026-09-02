import Storage from 'expo-sqlite/kv-store';

import { createMemoryStorage, kvStorage, persistedJSONStorage } from '../storage';

describe('kvStorage', () => {
  afterEach(() => {
    Storage.removeItemSync('probe');
  });

  it('reads and writes synchronously through expo-sqlite/kv-store', () => {
    kvStorage.setItem('probe', 'hello');
    expect(Storage.getItemSync('probe')).toBe('hello');
    expect(kvStorage.getItem('probe')).toBe('hello');
  });

  it('returns null for a missing key', () => {
    expect(kvStorage.getItem('nope')).toBeNull();
  });

  it('removes a key', () => {
    kvStorage.setItem('probe', 'hello');
    kvStorage.removeItem('probe');
    expect(kvStorage.getItem('probe')).toBeNull();
  });

  it('builds a zustand JSON storage', () => {
    expect(persistedJSONStorage()).toBeDefined();
  });
});

describe('createMemoryStorage', () => {
  it('falls back to memory when the sync API throws', () => {
    const boom = {
      getItemSync: () => {
        throw new Error('no native module');
      },
      setItemSync: () => {
        throw new Error('no native module');
      },
      removeItemSync: () => {
        throw new Error('no native module');
      },
    };
    const s = createMemoryStorage(boom);
    expect(s.getItem('k')).toBeNull();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });
});
