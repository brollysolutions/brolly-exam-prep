import type { ColorName } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';

import { Num } from './Num';
import { Row } from './Row';
import { Text, type TextProps } from './Text';

export type KickerProps = Omit<TextProps, 'variant' | 'weight' | 'color'> & {
  color?: ColorName;
  /** Section counter rendered before the label, e.g. "01". */
  index?: string;
  /** Counter colour; dark gold unless the section itself is the primary one. */
  indexColor?: ColorName;
};

/**
 * The bold, letter-spaced label that introduces every block. Default `ink3` (5.0:1 on cream —
 * the floor for text, and only at this weight); `ink4` is decorative and never a kicker.
 */
export function Kicker({
  color = 'ink3',
  index,
  indexColor = 'accentInk',
  className,
  ...rest
}: KickerProps) {
  const d = useDir();
  // Digits are always Latin-faced; their tracking must still follow the UI language like the label.
  const tracking = d.lang === 'en' ? 'kicker' : 'none';
  const label = (
    <Text
      variant="kicker"
      weight="700"
      color={color}
      tracking="kicker"
      className={index ? undefined : className}
      {...rest}
    />
  );
  if (!index) return label;
  return (
    <Row gap={2} align="baseline" className={className}>
      <Num variant="kicker" color={indexColor} tracking={tracking}>
        {index}
      </Num>
      {label}
    </Row>
  );
}
