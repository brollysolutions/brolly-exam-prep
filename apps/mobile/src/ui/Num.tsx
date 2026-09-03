import { Text, type TextProps } from './Text';

const LRI = '⁦';
const PDI = '⁩';

/**
 * The same LRI…PDI isolation `<Num>` applies, for a number that cannot be wrapped in one:
 * a value interpolated into a `t()` sentence, or an expected string in a test. It keeps its
 * reading order inside an Urdu line; only the tabular figures are lost, which at caption
 * size is invisible.
 */
export const iso = (value: number | string): string => `${LRI}${value}${PDI}`;

/**
 * Numbers, timers, phone numbers and scores: always tabular, always LTR, always the Latin face
 * (Archivo) so digits line up identically in every language. Content is wrapped in
 * LRI…PDI isolation so it never re-orders inside an Urdu sentence.
 */
export function Num({ children, weight = '700', ...rest }: TextProps) {
  const scalar = typeof children === 'string' || typeof children === 'number';
  return (
    <Text {...rest} weight={weight} lang="en" numeric accessibilityLanguage="en">
      {scalar ? iso(children as string | number) : [LRI, children, PDI]}
    </Text>
  );
}
