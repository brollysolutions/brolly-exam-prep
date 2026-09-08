import { LANGS, type Lang } from '@/lib/i18n';

const isLang = (value: string | null): value is Lang => LANGS.includes(value as Lang);

/** `?lang=te` → `'te'`; anything else (missing, empty, `?lang=fr`) → `undefined`. */
export function parseLangParam(search: string | null | undefined): Lang | undefined {
  if (!search) return undefined;
  const value = new URLSearchParams(search).get('lang');
  return isLang(value) ? value : undefined;
}

/**
 * Dev/web-only escape hatch: the screenshot tooling opens `…/login?lang=te` and gets the whole
 * app in Telugu without a language switcher on the screen. Native builds never see this — there is
 * no URL to read — so the stored preference stays the only way to change language on a phone.
 */
export function webLangOverride(): Lang | undefined {
  if (typeof window === 'undefined') return undefined;
  return parseLangParam(window.location?.search);
}
