import type { ColorName, FontWeight, TextName } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';

import { durationParts, formatDuration, type DurationUnits } from './format';
import { Num } from './Num';
import { Row } from './Row';
import { Text } from './Text';

/**
 * The duration units for the current language. English abuts them to the digits ("54s");
 * Telugu units are separate words ("54 sec"), which is how `COST_ROWS` already
 * spells the same quantities.
 */
export function useDurationUnits(): DurationUnits {
  const { t } = useTranslation();
  const d = useDir();
  return {
    minute: t('common.unitM'),
    second: t('common.unitS'),
    separator: d.lang === 'en' ? '' : ' ',
  };
}

export type DurationProps = {
  seconds: number;
  variant?: TextName;
  color?: ColorName;
  weight?: FontWeight;
  className?: string;
  testID?: string;
};

/**
 * A duration with its unit localised. The digits stay in `<Num>` - Latin face, tabular,
 * LTR-isolated - while the unit renders in the language's own face, because Inter has no
 * Telugu glyphs. Both rows follow the reading direction (RTL would read right-to-left
 * with the minutes leading); the flat string goes to the screen reader.
 */
export function Duration({
  seconds,
  variant = 'caption',
  color = 'ink3',
  weight = '600',
  className,
  testID,
}: DurationProps) {
  const units = useDurationUnits();
  return (
    <Row
      gap={1}
      align="baseline"
      className={className}
      accessible
      accessibilityLabel={formatDuration(seconds, units)}
      testID={testID}
    >
      {durationParts(seconds, units).map((part) => (
        <Row key={part.unit} align="baseline">
          <Num variant={variant} weight={weight} color={color}>
            {part.value}
          </Num>
          <Text variant={variant} weight={weight} color={color}>
            {`${units.separator}${part.unit}`}
          </Text>
        </Row>
      ))}
    </Row>
  );
}
