import Storage from 'expo-sqlite/kv-store';

import { createKvStorage, kvStorage, persistedJSONStorage } from '../storage';

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

describe('createKvStorage', () => {
  const alwaysThrows = () => ({
    getItemSync: () => {
      throw new Error('no native module');
    },
    setItemSync: () => {
      throw new Error('no native module');
    },
    removeItemSync: () => {
      throw new Error('no native module');
    },
  });

  it('falls back to memory when the sync API throws', () => {
    const s = createKvStorage(alwaysThrows());
    expect(s.getItem('k')).toBeNull();
    s.setItem('k', 'v');
    expect(s.getItem('k')).toBe('v');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });

  it('latches degraded on the first throw so reads and writes stay on one source', () => {
    let live = false;
    const flaky = {
      getItemSync: (k: string) => {
        if (!live) throw new Error('not ready');
        return `sqlite:${k}`;
      },
      setItemSync: () => {
        if (!live) throw new Error('not ready');
      },
      removeItemSync: () => {
        if (!live) throw new Error('not ready');
      },
    };
    const s = createKvStorage(flaky);

    s.setItem('k', 'memory-value'); // throws once, latches degraded
    live = true; // the native module "recovers" — the adapter must not follow it back

    expect(s.getItem('k')).toBe('memory-value');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });

  it('keeps the latch per adapter', () => {
    const broken = createKvStorage(alwaysThrows());
    broken.setItem('probe', 'memory');
    expect(kvStorage.getItem('probe')).toBeNull();
    expect(broken.getItem('probe')).toBe('memory');
  });
});
