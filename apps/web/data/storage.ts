import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Web build of the storage adapter. Metro picks `.web.ts` over `.ts` on web, so this file
 * replaces `storage.ts` there and `expo-sqlite/kv-store` is never bundled for the browser.
 *
 * Why not the SQLite adapter on web: `expo-sqlite/kv-store` boots a wasm Web Worker that
 * Metro's static/SSR renderer cannot chunk ("Worker chunk not found …/expo-sqlite/web/worker.ts"),
 * and even when it loads, its sync API falls back to memory. `localStorage` is synchronous,
 * survives reloads, and is what a browser expects.
 *
 * Same surface as `storage.ts` so every persisted store imports `./storage` unchanged.
 */
export type SyncKvStore = {
  getItemSync: (key: string) => string | null;
  setItemSync: (key: string, value: string) => void;
  removeItemSync: (key: string) => void;
};

const hasLocalStorage = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

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

/** `localStorage` behind the sync kv interface; throws (→ memory latch) when unavailable, e.g. during static rendering. */
const browserStore: SyncKvStore = {
  getItemSync: (key) => {
    if (!hasLocalStorage()) throw new Error('localStorage unavailable');
    return window.localStorage.getItem(key);
  },
  setItemSync: (key, value) => {
    if (!hasLocalStorage()) throw new Error('localStorage unavailable');
    window.localStorage.setItem(key, value);
  },
  removeItemSync: (key) => {
    if (!hasLocalStorage()) throw new Error('localStorage unavailable');
    window.localStorage.removeItem(key);
  },
};

/** The one storage adapter every persisted store in `src/data` shares (web flavour). */
export const kvStorage: StateStorage = createKvStorage(browserStore);

/** `createJSONStorage(() => kvStorage)` — pass straight to `persist({ storage })`. */
export const persistedJSONStorage = () => createJSONStorage(() => kvStorage);
