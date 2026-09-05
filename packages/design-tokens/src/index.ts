import raw from '../tokens.json';

/** Single source of truth. Never hard-code a hex, size or duration outside this package. */
export const tokens = raw;

export type ColorName = keyof typeof raw.colors;
export type SpaceName = keyof typeof raw.spacing;
export type RadiusName = keyof typeof raw.radius;
export type TextName = keyof typeof raw.text;
export type Lang = 'en' | 'te';
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
export const fonts = raw.font as Record<
  Lang,
  {
    family: string;
    weights: Record<FontWeight, string>;
    lineHeight: number;
    /** Added to every role's size (0 for both shipped faces; kept for a face that runs small). */
    bodyDelta: number;
    /** Floor for any role (0 = none). */
    minSize: number;
    /**
     * Floor for the `kicker` role alone. Kickers are 10.5 px, bold and letter-spaced: legible
     * in Archivo's caps, but Telugu carries its meaning in marks that vanish at that
     * size (design review round 1). `0` means "no special floor".
     */
    kickerMin: number;
  }
>;

/** Resolve the font family, size and line-height for a language + weight + text role. */
export function typography(lang: Lang, role: TextName, weight: FontWeight = '400') {
  const f = fonts[lang];
  const floor = role === 'kicker' ? Math.max(f.minSize, f.kickerMin) : f.minSize;
  const base = Math.max(raw.text[role] + f.bodyDelta, floor);
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
