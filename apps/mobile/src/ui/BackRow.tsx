import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { Pressable } from 'react-native';

import { cx } from './cx';
import { Glyph } from './Glyph';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type BackRowProps = {
  label: string;
  onPress: () => void;
  /** The row gets `<testID>-row` and the chevron `<testID>-chevron`. */
  testID?: string;
};

/** The 48 px "‹ Back" row that opens a secondary screen. Mirrors with the reading direction. */
export function BackRow({ label, onPress, testID }: BackRowProps) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      android_ripple={{ color: colors.accentTint }}
      onPress={onPress}
      {...handlers}
      // Pressed = a `surface2` fill, the only feedback that shows on cream (see `pressedClass`).
      className={cx('h-touch justify-center', pressed && pressedClass)}
    >
      <Row testID={testID ? `${testID}-row` : undefined} gap={2} align="center">
        <Glyph
          testID={testID ? `${testID}-chevron` : undefined}
          color="ink3"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {d.chevronPrev}
        </Glyph>
        <Text variant="body" weight="600" color="ink2">
          {label}
        </Text>
      </Row>
    </Pressable>
  );
}
