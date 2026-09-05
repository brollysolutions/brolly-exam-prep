import type { ColorName, FontWeight, TextName } from '@tslprb/design-tokens';

import { Num } from './Num';
import { Row } from './Row';
import { Text } from './Text';

export type MeasureProps = {
  /** The quantity. Rendered in `<Num>`: Latin face, tabular, LTR-isolated. */
  value: number | string;
  /** The unit noun, already localised — it renders in the language's own face. */
  unit: string;
  variant?: TextName;
  color?: ColorName;
  /** Weight of the digits; the unit stays at the variant's default. */
  weight?: FontWeight;
  className?: string;
  testID?: string;
};

/**
 * Digits plus a unit noun — "40 questions", "60 min". The one shape that keeps `<Num>` and
 * `t()` both honest: the number stays in the Latin face where it lines up and never re-orders,
 * and the unit keeps its own script, because Archivo has no Telugu glyphs. The row follows
 * the reading direction (RTL would read right-to-left with the number leading).
 *
 * Use `Duration` instead when the quantity is a span of time that may carry two units.
 */
export function Measure({
  value,
  unit,
  variant = 'caption',
  color = 'dim',
  weight = '600',
  className,
  testID,
}: MeasureProps) {
  return (
    <Row gap={1} align="baseline" className={className} testID={testID}>
      <Num variant={variant} weight={weight} color={color}>
        {value}
      </Num>
      <Text variant={variant} color={color}>
        {unit}
      </Text>
    </Row>
  );
}
