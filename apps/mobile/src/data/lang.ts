import { setLanguage, type Lang } from '@tslprb/i18n';
import Storage from 'expo-sqlite/kv-store';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type LangState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const LANG_STORAGE_KEY = 'tslprb.lang';

/**
 * Synchronous adapter over expo-sqlite's kv-store so the store hydrates during `create()`,
 * letting the root layout read the stored language before the first render.
 * Falls back to memory when the sync API is unavailable (web without SQLite wasm).
 */
const memory = new Map<string, string>();
const storage: StateStorage = {
  getItem: (name) => {
    try {
      return Storage.getItemSync(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    try {
      Storage.setItemSync(name, value);
    } catch {
      memory.set(name, value);
    }
  },
  removeItem: (name) => {
    try {
      Storage.removeItemSync(name);
    } catch {
      memory.delete(name);
    }
  },
};

export const useLangStore = create<LangState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => {
        set({ lang });
        void setLanguage(lang);
      },
    }),
    {
      name: LANG_STORAGE_KEY,
      storage: createJSONStorage(() => storage),
      partialize: (s) => ({ lang: s.lang }),
    },
  ),
);
