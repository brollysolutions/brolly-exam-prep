import { setLanguage, type Lang } from '@tslprb/i18n';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistedJSONStorage } from './storage';

export type LangState = {
  lang: Lang;
  setLang: (lang: Lang) => void;
};

export const LANG_STORAGE_KEY = 'tslprb.lang';

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
      storage: persistedJSONStorage(),
      partialize: (s) => ({ lang: s.lang }),
    },
  ),
);
