import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import te from '../locales/te.json';

export type Lang = 'en' | 'te';
export const LANGS: readonly Lang[] = ['en', 'te'] as const;
/**
 * Languages written right-to-left. Empty since F-26 (Urdu removed at the user's request): the
 * direction helpers stay wired so an RTL language can be added back without touching screens.
 */
const RTL_LANGS: ReadonlySet<string> = new Set();

export const isRTL = (lang: string): boolean => RTL_LANGS.has(lang);

export const i18n = i18next;

/** Idempotent. English is the default; the stored preference (if any) is applied by the app on boot. */
export function initI18n(initial: Lang = 'en') {
  if (i18next.isInitialized) {
    if (i18next.language !== initial) void i18next.changeLanguage(initial);
    return i18next;
  }
  void i18next.use(initReactI18next).init({
    resources: { en: { translation: en }, te: { translation: te } },
    lng: initial,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnObjects: true,
  });
  return i18next;
}

export function setLanguage(lang: Lang) {
  return i18next.changeLanguage(lang);
}
