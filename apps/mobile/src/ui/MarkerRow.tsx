import { Ionicons } from '@expo/vector-icons';
import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { cx } from './cx';
import { Glyph } from './Glyph';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Stack } from './Stack';
import { Text } from './Text';

/**
 * What the row's leading mark says, in the app's status vocabulary: a gold dot is there to be
 * done, an ink check is done, a grey lock is not yours yet. `none` leaves the title at the edge.
 */
export type Marker = 'none' | 'dot' | 'done' | 'locked';

export type MarkerRowProps = {
  title: string;
  /** The `ink3` line under the title: minutes, a date, a count. */
  meta?: string;
  marker?: Marker;
  /** At the reading end: a `Pill`, a `Chip`, a button. Drawn before the chevron. */
  trailing?: ReactNode;
  /** The `ink3` "goes somewhere" chevron at the reading end. */
  chevron?: boolean;
  onPress?: () => void;
  /** The first row inside a card: no hairline above it. */
  first?: boolean;
  /** Overrides the composed label (title + meta) a screen reader would otherwise hear. */
  accessibilityLabel?: string;
  testID?: string;
};

const ICON = 18;

/** The mark itself. Non-text, so the gold dot may be `accentStrong` (3.4:1 on cream). */
function Mark({ marker, testID }: { marker: Marker; testID?: string }) {
  if (marker === 'none') return null;
  if (marker === 'dot') {
    return <View testID={testID} className="h-2 w-2 rounded-full bg-accentStrong" />;
  }
  return (
    <Ionicons
      testID={testID}
      name={marker === 'done' ? 'checkmark-circle' : 'lock-closed-outline'}
      size={ICON}
      color={marker === 'done' ? colors.ink : colors.ink3}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/**
 * One line of a list inside a card: a mark, a title, an optional second line, and whatever the
 * row leads to. Study sections, library shelves, profile settings, affairs and result rows are
 * all this row.
 *
 * A minimum height of 56 px, never a fixed one: a title over its meta grows the row to about
 * 72, and a Telugu title grows it further instead of being clipped. The hairline sits on top
 * rather than underneath, so the last row never draws a line against the card's own border.
 */
export function MarkerRow({
  title,
  meta,
  marker = 'none',
  trailing,
  chevron = false,
  onPress,
  first = false,
  accessibilityLabel,
  testID,
}: MarkerRowProps) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  const body = (
    <Row
      testID={testID ? `${testID}-row` : undefined}
      gap={3}
      align="center"
      className="min-h-touchLg py-2"
    >
      <Mark marker={marker} testID={testID ? `${testID}-marker` : undefined} />
      <Stack gap={1} className="flex-1">
        <Text variant="body" weight="600">
          {title}
        </Text>
        {meta !== undefined && (
          <Text variant="caption" color="ink3">
            {meta}
          </Text>
        )}
      </Stack>
      {trailing}
      {chevron && (
        <Glyph color="ink3" accessibilityElementsHidden importantForAccessibility="no">
          {d.chevronNext}
        </Glyph>
      )}
    </Row>
  );
  const border = first ? undefined : 'border-t border-line';
  if (!onPress) {
    return (
      <View testID={testID} className={border}>
        {body}
      </View>
    );
  }
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title} ${meta}` : title)}
      android_ripple={{ color: colors.accentTint }}
      onPress={onPress}
      {...handlers}
      // Pressed = a `surface2` fill, the only feedback that shows on cream (`pressedClass`).
      className={cx(border, pressed && pressedClass)}
    >
      {body}
    </Pressable>
  );
}
