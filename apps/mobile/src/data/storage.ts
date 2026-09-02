import Storage from 'expo-sqlite/kv-store';
import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * The slice of `expo-sqlite/kv-store` we depend on: the *synchronous* API, so zustand's
 * `persist` rehydrates during `create()` and the first render already sees stored state
 * (no flash of defaults on the root layout).
 */
export type SyncKvStore = {
  getItemSync: (key: string) => string | null;
  setItemSync: (key: string, value: string) => void;
  removeItemSync: (key: string) => void;
};

/**
 * Wraps a sync kv store in zustand's `StateStorage`.
 *
 * The native module is absent on web without the SQLite wasm build and in some test
 * runners, where every call throws. The first throw latches this adapter as `degraded`
 * and every later read *and* write goes to an in-process Map, so a store can never end up
 * half in SQLite and half in memory (writing to memory then reading back a stale SQLite
 * value, say). The latch is per adapter, so one store degrading does not affect another.
 *
 * Nothing survives a reload once degraded -- that is the honest failure mode for a
 * platform with no storage, and it is strictly better than mixed sources of truth.
 */
export function createKvStorage(store: SyncKvStore): StateStorage {
  const memory = new Map<string, string>();
  let degraded = false;

  return {
    getItem: (name) => {
      if (degraded) return memory.get(name) ?? null;
      try {
        return store.getItemSync(name);
      } catch {
        degraded = true;
        return memory.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      if (degraded) {
        memory.set(name, value);
        return;
      }
      try {
        store.setItemSync(name, value);
      } catch {
        degraded = true;
        memory.set(name, value);
      }
    },
    removeItem: (name) => {
      if (degraded) {
        memory.delete(name);
        return;
      }
      try {
        store.removeItemSync(name);
      } catch {
        degraded = true;
        memory.delete(name);
      }
    },
  };
}

/** The one storage adapter every persisted store in `src/data` shares. */
export const kvStorage: StateStorage = createKvStorage(Storage);

/** `createJSONStorage(() => kvStorage)` — pass straight to `persist({ storage })`. */
export const persistedJSONStorage = () => createJSONStorage(() => kvStorage);
