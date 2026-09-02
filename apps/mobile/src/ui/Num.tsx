import { Text, type TextProps } from './Text';

const LRI = '⁦';
const PDI = '⁩';

/**
 * Numbers, timers, phone numbers and scores: always tabular, always LTR, always the Latin face
 * (Archivo) so digits line up identically in every language. Content is wrapped in
 * LRI…PDI isolation so it never re-orders inside an Urdu sentence.
 */
export function Num({ children, weight = '700', ...rest }: TextProps) {
  const scalar = typeof children === 'string' || typeof children === 'number';
  return (
    <Text {...rest} weight={weight} lang="en" numeric accessibilityLanguage="en">
      {scalar ? `${LRI}${children}${PDI}` : [LRI, children, PDI]}
    </Text>
  );
}
