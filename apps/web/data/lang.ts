import { setLanguage, type Lang } from '@/lib/i18n';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

export type LangState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /**
   * Back to the default language. Not part of `signOut()` — the language is how this handset
   * is read, not who read it — but part of the full wipe, which returns the app to the state
   * it was installed in. It goes through `setLang` so the i18next hop stays in one place:
   * setting the state alone would leave the UI in Telugu with the store claiming English.
   */
  reset: () => void;
};

export const LANG_STORAGE_KEY = 'tslprb.lang';

/** What the app reads in before anyone chooses. */
export const DEFAULT_LANG: Lang = 'en';

export const useLangStore = create<LangState>()(
  persist(
    (set, get) => ({
      lang: DEFAULT_LANG,
      setLang: (lang) => {
        set({ lang });
        void setLanguage(lang);
      },
      reset: () => get().setLang(DEFAULT_LANG),
    }),
    {
      name: LANG_STORAGE_KEY,
      storage: persistedJSONStorage(),
      partialize: (s) => ({ lang: s.lang }),
    },
  ),
);
