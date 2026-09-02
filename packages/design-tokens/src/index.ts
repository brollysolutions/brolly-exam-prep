import raw from '../tokens.json';

/** Single source of truth. Never hard-code a hex, size or duration outside this package. */
export const tokens = raw;

export type ColorName = keyof typeof raw.colors;
export type SpaceName = keyof typeof raw.spacing;
export type RadiusName = keyof typeof raw.radius;
export type TextName = keyof typeof raw.text;
export type Lang = 'en' | 'te' | 'ur';
export type FontWeight = '400' | '500' | '600' | '700';

export const colors = raw.colors;
export const spacing = raw.spacing;
export const radius = raw.radius;
export const size = raw.size;
export const text = raw.text;
export const tracking = raw.tracking;
export const motion = raw.motion;
export const hazard = raw.hazard;

/** Font metadata per language; the loaded font family name comes from `weights`. */
export const fonts = raw.font as Record<Lang, { family: string; weights: Record<FontWeight, string>; lineHeight: number; bodyDelta: number }>;

/** Resolve the font family, size and line-height for a language + weight + text role. */
export function typography(lang: Lang, role: TextName, weight: FontWeight = '400') {
  const f = fonts[lang];
  const base = raw.text[role] + (role === 'kicker' ? 0 : f.bodyDelta);
  return {
    fontFamily: f.weights[weight],
    fontSize: base,
    lineHeight: Math.round(base * f.lineHeight * 10) / 10,
    letterSpacing: lang === 'en' && role === 'kicker' ? raw.tracking.kicker : 0,
  };
}

/** Palette cell states (see prototype `CS` map). */
export const paletteState = {
  nv: { bg: colors.panel3, fg: colors.steel, border: colors.line, borderWidth: 1 },
  na: { bg: 'transparent', fg: colors.flag, border: colors.flag, borderWidth: 2 },
  a: { bg: colors.hivis, fg: colors.tar, border: colors.hivis, borderWidth: 2 },
  m: { bg: colors.hazard, fg: colors.tar, border: colors.hazard, borderWidth: 2 },
  am: { bg: colors.hazard, fg: colors.tar, border: colors.hazard, borderWidth: 2 },
} as const;
export type PaletteState = keyof typeof paletteState;
