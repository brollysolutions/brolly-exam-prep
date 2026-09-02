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
 * Wraps a sync kv store in zustand's `StateStorage`, falling back to an in-process Map when
 * the native module is unavailable (web without the SQLite wasm build, some test runners).
 * The fallback is per-adapter, so a store that falls back stays consistent with itself.
 */
export function createMemoryStorage(store: SyncKvStore): StateStorage {
  const memory = new Map<string, string>();
  return {
    getItem: (name) => {
      try {
        return store.getItemSync(name);
      } catch {
        return memory.get(name) ?? null;
      }
    },
    setItem: (name, value) => {
      try {
        store.setItemSync(name, value);
      } catch {
        memory.set(name, value);
      }
    },
    removeItem: (name) => {
      try {
        store.removeItemSync(name);
      } catch {
        memory.delete(name);
      }
    },
  };
}

/** The one storage adapter every persisted store in `src/data` shares. */
export const kvStorage: StateStorage = createMemoryStorage(Storage);

/** `createJSONStorage(() => kvStorage)` — pass straight to `persist({ storage })`. */
export const persistedJSONStorage = () => createJSONStorage(() => kvStorage);
