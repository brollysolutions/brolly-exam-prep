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

  it('keeps pending writes readable until they are saved after recovery', () => {
    let live = false;
    const disk = new Map<string, string>();
    const flaky = {
      getItemSync: (k: string) => {
        if (!live) throw new Error('not ready');
        return disk.get(k) ?? null;
      },
      setItemSync: (key: string, value: string) => {
        if (!live) throw new Error('not ready');
        disk.set(key, value);
      },
      removeItemSync: (key: string) => {
        if (!live) throw new Error('not ready');
        disk.delete(key);
      },
    };
    const s = createKvStorage(flaky);

    s.setItem('k', 'memory-value');
    live = true;

    expect(s.getItem('k')).toBe('memory-value');
    expect(s.retry()).toBe(true);
    expect(disk.get('k')).toBe('memory-value');
    s.removeItem('k');
    expect(s.getItem('k')).toBeNull();
  });

  it('retains previously read keys after a later database read failure', () => {
    let failed = false;
    const s = createKvStorage({
      getItemSync: () => {
        if (failed) throw new Error('database unavailable');
        return 'saved answers';
      },
      setItemSync: () => undefined,
      removeItemSync: () => undefined,
    });
    expect(s.getItem('attempt')).toBe('saved answers');
    failed = true;
    expect(s.getItem('attempt')).toBe('saved answers');
    expect(s.getStatus()).toBe('temporary');
  });

  it('keeps the latch per adapter', () => {
    const broken = createKvStorage(alwaysThrows());
    broken.setItem('probe', 'memory');
    expect(kvStorage.getItem('probe')).toBeNull();
    expect(broken.getItem('probe')).toBe('memory');
  });
});
