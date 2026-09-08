import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../../../packages/i18n/locales/en.json';
import te from '../../../packages/i18n/locales/te.json';

export { en, te };
export type Lang = 'en' | 'te';
export const LANGS: readonly Lang[] = ['en', 'te'];
export const i18n = i18next.createInstance();
export function initI18n(lang: Lang = 'en') {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, te: { translation: te } },
      lng: lang,
      fallbackLng: 'en',
      initAsync: false,
      interpolation: { escapeValue: false },
    });
  } else if (i18n.language !== lang) void i18n.changeLanguage(lang);
  return i18n;
}
export const setLanguage = (lang: Lang) => i18n.changeLanguage(lang);
