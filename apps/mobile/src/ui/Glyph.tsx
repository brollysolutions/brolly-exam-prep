import { Text, type TextProps } from './Text';

export type GlyphProps = Omit<TextProps, 'lang'> & { children: string };

/**
 * A symbol, not a word: chevrons, ⌫, ■. Always rendered in the Latin face, because Noto
 * Nastaliq Urdu has no glyph for U+2039/U+203A/U+232B and falls back to tofu.
 */
export function Glyph({ variant = 'glyph', ...rest }: GlyphProps) {
  return <Text {...rest} variant={variant} lang="en" />;
}
