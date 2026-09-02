import { useTranslation } from 'react-i18next';
import { typography, type FontWeight, type TextName } from '@tslprb/design-tokens';
import { isRTL, type Lang } from './i18n';

/**
 * Direction helpers that follow the IN-APP language, not the OS locale.
 * We deliberately avoid I18nManager / start-end style props: they need an app restart,
 * and the prototype switches Urdu live from the test header.
 */
export type Dir = {
  lang: Lang;
  isRTL: boolean;
  /** flexDirection for a horizontal row that should mirror. */
  row: 'row' | 'row-reverse';
  /** textAlign for reading-order aligned text. */
  textAlign: 'left' | 'right';
  /** Physical side that is the reading start / end. */
  start: 'left' | 'right';
  end: 'left' | 'right';
  chevronNext: '›' | '‹';
  chevronPrev: '‹' | '›';
  /** Pick the LTR or RTL value. */
  pick: <T>(ltr: T, rtl: T) => T;
};

export function useLang(): Lang {
  const { i18n } = useTranslation();
  const l = i18n.language.slice(0, 2);
  return (l === 'te' || l === 'ur' ? l : 'en') as Lang;
}

export function useDir(): Dir {
  const lang = useLang();
  const rtl = isRTL(lang);
  return {
    lang,
    isRTL: rtl,
    row: rtl ? 'row-reverse' : 'row',
    textAlign: rtl ? 'right' : 'left',
    start: rtl ? 'right' : 'left',
    end: rtl ? 'left' : 'right',
    chevronNext: rtl ? '‹' : '›',
    chevronPrev: rtl ? '›' : '‹',
    pick: (ltr, rtlValue) => (rtl ? rtlValue : ltr),
  };
}

/** Tailwind helper: `className={dir(d, 'ml-2', 'mr-2')}`. */
export function dir(d: Pick<Dir, 'isRTL'>, ltrClass: string, rtlClass: string): string {
  return d.isRTL ? rtlClass : ltrClass;
}

/** Font family / size / line-height for the current language and role. */
export function useTypography(role: TextName, weight: FontWeight = '400') {
  const lang = useLang();
  return typography(lang, role, weight);
}
