import raw from '../tokens.json';

/** Single source of truth. Never hard-code a hex, size or duration outside this package. */
export const tokens = raw;

/**
 * Semantic colours (Brolly on cream), and the only colour names there are. The hi-vis-on-tar
 * aliases that let the pre-rebrand screens compile through Phases A-D were deleted in Phase E
 * (F-32); `test/legacy.test.mjs` fails if one reappears anywhere in `apps/mobile/src`.
 */
export const semanticColors = raw.colors;
/** The raw brand scale the semantic names are drawn from. Tests only; components use `colors`. */
export const palette = raw.palette;
export const colors = raw.colors;

export type ColorName = keyof typeof colors;
export type SemanticColorName = ColorName;
export type SpaceName = keyof typeof raw.spacing;
export type RadiusName = keyof typeof raw.radius;
export type ShadowName = keyof typeof raw.shadow;
export type TextName = keyof typeof raw.text;
export type Lang = 'en' | 'te';
export type FontWeight = '400' | '500' | '600' | '700' | '800';

export const spacing = raw.spacing;
export const radius = raw.radius;
export const size = raw.size;
export const text = raw.text;
export const tracking = raw.tracking;
export const motion = raw.motion;
export const shadow = raw.shadow;

/**
 * A warm ink shadow as a style object (`boxShadow`: CSS on web, native since RN 0.76).
 * Cards carry `card`, floating toasts `raised`, dialogs `sheet` (cast upward; the bottom sheet
 * is a `@gorhom` surface and carries no shadow of its own).
 */
export function shadowStyle(name: ShadowName): { boxShadow: string } {
  return { boxShadow: raw.shadow[name] };
}

type DisplayFace = {
  family: string;
  /**
   * One weight per face: every `weight` maps to `regular` (Playfair Regular in en, Noto Serif
   * Telugu Bold in te); `italic` picks the italic file where the face has one (Telugu has none,
   * so it names the same file).
   */
  regular: string;
  italic: string;
  lineHeight: number;
};

/** Font metadata per language; the loaded font family name comes from `weights`. */
export const fonts = raw.font as Record<
  Lang,
  {
    family: string;
    weights: Record<FontWeight, string>;
    /** The serif display face (titles, hero lines, the wordmark): Playfair in en, Noto Serif Telugu in te. */
    display?: DisplayFace;
    lineHeight: number;
    /** Added to every role's size (0 for both shipped faces; kept for a face that runs small). */
    bodyDelta: number;
    /** Floor for any role (0 = none). */
    minSize: number;
    /**
     * Floor for the `kicker` role alone. Kickers are 10.5 px, bold and letter-spaced: legible
     * in Inter's caps, but Telugu carries its meaning in marks that vanish at that
     * size (design review round 1). `0` means "no special floor".
     */
    kickerMin: number;
  }
>;

/** Roles set in the display face (Playfair) when the language has one. */
export const face = raw.face as Partial<Record<TextName, 'display'>>;

export type TypographyOptions = {
  /** Italic display face ("Solutions" in the wordmark). Ignored by the text face. */
  italic?: boolean;
  /**
   * Digits stay in Inter whatever the role — a `display`-sized number is still tabular
   * Inter, so timers and scores line up in every language (`<Num>` sets this).
   */
  numeric?: boolean;
};

/**
 * Resolve the font family, size, line-height and tracking for a language + role + weight.
 *
 * Display roles (`face` map) render in the language's serif: Playfair for `en` (one weight,
 * 1.2 line-height, the `display` tracking), Noto Serif Telugu 700 for `te` (1.5 line-height,
 * no tracking — letter-spacing is Latin-only). A language without a serif would fall back to
 * its text face at 700.
 */
export function typography(
  lang: Lang,
  role: TextName,
  weight: FontWeight = '400',
  { italic = false, numeric = false }: TypographyOptions = {},
) {
  const f = fonts[lang];
  const floor = role === 'kicker' ? Math.max(f.minSize, f.kickerMin) : f.minSize;
  const base = Math.max(raw.text[role] + f.bodyDelta, floor);
  const isDisplay = face[role] === 'display' && !numeric;
  const display = isDisplay ? f.display : undefined;
  if (display) {
    const wordmark = role === 'wordmark' || role === 'wordmarkSub';
    return {
      fontFamily: italic ? display.italic : display.regular,
      fontSize: base,
      lineHeight: Math.round(base * display.lineHeight * 10) / 10,
      letterSpacing: wordmark || lang !== 'en' ? 0 : raw.tracking.display,
    };
  }
  const w: FontWeight = isDisplay && weight !== '800' ? '700' : weight;
  return {
    fontFamily: f.weights[w],
    fontSize: base,
    lineHeight: Math.round(base * f.lineHeight * 10) / 10,
    letterSpacing: lang === 'en' && role === 'kicker' ? raw.tracking.kicker : 0,
  };
}

/**
 * Palette cell states. Brand semantics (decision 2026-09-05): plain = unvisited, red = not
 * answered, gold = answered (the candidate's own input), ink = marked (a deliberate flag).
 *
 * `solid` says whether the cell has a fill dense enough to dim under a finger. The gold and
 * ink cells do, so they take the filled-control dim; the quiet and the red-tinted ones do not
 * — a 12 % tint at 85 % opacity is the same tint — so they take the `surface2` press fill
 * every outlined control on cream uses.
 *
 * The unvisited cell is an OUTLINED CONTROL, not a quiet tile: `surface` under a 1 px
 * `outline` (**3.12:1** on the sheet the grid sits on), the same rest boundary as a secondary
 * button or an inactive chip. It carried `surface2` under `line` for one phase, which gave the
 * most numerous cell in the grid a 1.19:1 edge — and, because `surface2` is also the press
 * fill every outlined control on cream takes, no press state at all (fix wave 1, D1/C1). One
 * mechanism: the resting fill moves, and the press fill it already had becomes a real change.
 */
export const paletteState = {
  nv: { bg: colors.surface, fg: colors.ink3, border: colors.outline, borderWidth: 1, solid: false },
  na: {
    bg: colors.dangerTint,
    fg: colors.dangerInk,
    border: colors.dangerInk,
    borderWidth: 2,
    solid: false,
  },
  a: { bg: colors.accent, fg: colors.ink, border: colors.accent, borderWidth: 2, solid: true },
  m: { bg: colors.ink, fg: colors.onInk, border: colors.ink, borderWidth: 2, solid: true },
  am: { bg: colors.ink, fg: colors.onInk, border: colors.ink, borderWidth: 2, solid: true },
} as const;
export type PaletteState = keyof typeof paletteState;
