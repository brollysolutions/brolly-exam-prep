import type { ColorName } from '@tslprb/design-tokens';

import { Num } from './Num';
import { Row } from './Row';
import { Text, type TextProps } from './Text';

export type KickerProps = Omit<TextProps, 'variant' | 'weight' | 'color'> & {
  color?: ColorName;
  /** Section counter rendered in hazard orange before the label, e.g. "01". */
  index?: string;
};

/** The 10.5 px bold, letter-spaced label that introduces every block. */
export function Kicker({ color = 'mute', index, className, ...rest }: KickerProps) {
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
      <Num variant="kicker" color="hazard">
        {index}
      </Num>
      {label}
    </Row>
  );
}
