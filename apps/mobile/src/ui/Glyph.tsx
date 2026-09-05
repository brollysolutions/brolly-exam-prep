import { Text, type TextProps } from './Text';

export type GlyphProps = Omit<TextProps, 'lang'> & { children: string };

/**
 * A symbol, not a word: chevrons, ⌫, ■. Always rendered in the Latin face, so a symbol never
 * depends on the language face carrying U+2039/U+203A/U+232B (a missing glyph is tofu).
 */
export function Glyph({ variant = 'glyph', ...rest }: GlyphProps) {
  return <Text {...rest} variant={variant} lang="en" />;
}
