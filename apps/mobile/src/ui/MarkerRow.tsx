import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import { useDir, useTypography } from '@tslprb/i18n';
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

/**
 * The three shapes `meta`, `onPress` and `accessibilityLabel` are allowed to take together —
 * a union rather than a doc comment, so the a11y contract is unrepresentable when broken
 * (code review 4).
 *
 * A node `meta` is silent **in the composed name**, and only a pressable row composes one: a
 * static row is a plain `View` whose children a screen reader walks in order, so a node there
 * reads itself. That is why the third arm needs no label and the second one does.
 */
type MarkerRowName =
  /** A string meta (or none): the pattern draws it and can read it back into the row's name. */
  | { meta?: string; onPress?: () => void; accessibilityLabel?: string }
  /** A node meta on a button: the composed name would drop it, so the row must be named. */
  | { meta: ReactNode; onPress: () => void; accessibilityLabel: string }
  /** A node meta on a static row: nothing is composed, so the children speak for themselves. */
  | { meta: ReactNode; onPress?: undefined; accessibilityLabel?: undefined };

type MarkerRowBase = {
  title: string;
  /**
   * Cap the title at n lines. Left off, it grows — Profile and Study rows carry short labels
   * and a Telugu one has to be allowed to wrap; Home's affair headline takes `titleLines={2}`.
   */
  titleLines?: number;
  marker?: Marker;
  /**
   * At the reading end: a `Pill`, a `Chip`, a `<Num>`. Drawn before the chevron.
   *
   * Decoration, not a control: once `onPress` is set the whole row is one button, so anything
   * pressable in here is unreachable — a screen reader never gets to it and a tap on it fires
   * the row. A row with two destinations needs two rows.
   */
  trailing?: ReactNode;
  /**
   * What `trailing` says, for the composed name — an explicit `accessibilityLabel` (this one,
   * or the caller's) stops children being read, so a trailing date is silent without it.
   */
  trailingLabel?: string;
  /** The `ink3` "goes somewhere" chevron at the reading end. */
  chevron?: boolean;
  /** The first row inside a card: no hairline above it. */
  first?: boolean;
  className?: string;
  testID?: string;
  /**
   * Names for the two lines the pattern draws, where a screen already had one (Affairs keeps
   * `affair-headline-<id>` / `affair-summary-<id>`). The same split as `PageHeader`: the
   * pattern owns the typography, the caller owns the name. `metaTestID` reaches a string
   * `meta` only — a node carries its own.
   */
  titleTestID?: string;
  metaTestID?: string;
};

/**
 * `meta`, `onPress` and `accessibilityLabel` come from the union above; everything else is
 * plain. See `MarkerRowName` for why a node meta drags the label in with it.
 */
export type MarkerRowProps = MarkerRowBase & MarkerRowName;

const ICON = size.icon;

/**
 * The mark itself, in a fixed slot: an 8 px dot and an 18 px icon would otherwise start their
 * titles on two different axes down one card. Non-text, so the gold dot may be `accentStrong`
 * (3.4:1 on cream).
 */
function Mark({ marker, testID }: { marker: Marker; testID?: string }) {
  if (marker === 'none') return null;
  return marker === 'dot' ? (
    <View testID={testID} className="h-2 w-2 rounded-full bg-accentStrong" />
  ) : (
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
 *
 * The mark and the trailing slot are each boxed to one body line and pinned to the top of the
 * content, so a wrapped title keeps them on line 1 instead of dragging them to the middle of
 * two (design review D4). A MINIMUM, not a height: Profile's language switcher is a 48 px
 * control in that slot, and a fixed line box would clip it. The 56 px floor and the vertical
 * centring live on the row's own wrapper, so a one-line row is laid out exactly as it was.
 */
export function MarkerRow({
  title,
  meta,
  titleLines,
  marker = 'none',
  trailing,
  trailingLabel,
  chevron = false,
  onPress,
  first = false,
  accessibilityLabel,
  className,
  testID,
  titleTestID,
  metaTestID,
}: MarkerRowProps) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  // The language's own body line, so a Telugu row boxes to its taller line rather than clipping.
  const lh = useTypography('body').lineHeight;
  const slot = { minHeight: lh, alignSelf: 'flex-start' } as const;
  const end = trailing !== undefined || chevron;
  const body = (
    <Row testID={testID ? `${testID}-row` : undefined} gap={3} align="center">
      {marker !== 'none' && (
        <View
          testID={testID ? `${testID}-mark` : undefined}
          className="items-center justify-center"
          style={{ ...slot, width: ICON }}
        >
          <Mark marker={marker} testID={testID ? `${testID}-marker` : undefined} />
        </View>
      )}
      <Stack gap={1} className="flex-1">
        <Text variant="body" weight="600" numberOfLines={titleLines} testID={titleTestID}>
          {title}
        </Text>
        {typeof meta === 'string' ? (
          <Text variant="caption" color="ink3" testID={metaTestID}>
            {meta}
          </Text>
        ) : (
          meta
        )}
      </Stack>
      {end && (
        <Row testID={testID ? `${testID}-end` : undefined} gap={2} align="center" style={slot}>
          {trailing}
          {chevron && (
            <Glyph color="ink3" accessibilityElementsHidden importantForAccessibility="no">
              {d.chevronNext}
            </Glyph>
          )}
        </Row>
      )}
    </Row>
  );
  // The floor and the vertical centring belong to the wrapper: the inner row tops its children
  // out, and the wrapper centres that whole block inside the 56 px.
  const box = cx(
    'min-h-touchLg justify-center py-2',
    first ? undefined : 'border-t border-line',
    className,
  );
  if (!onPress) {
    return (
      <View testID={testID} className={box}>
        {body}
      </View>
    );
  }
  // Only what a label can read: a node `meta` names itself through the row's own
  // `accessibilityLabel`, because half a rendered tree is not a sentence.
  const composed = [title, typeof meta === 'string' ? meta : undefined, trailingLabel]
    .filter(Boolean)
    .join(' ');
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? composed}
      android_ripple={{ color: colors.accentTint }}
      onPress={onPress}
      {...handlers}
      // Pressed = a `surface2` fill, the only feedback that shows on cream (`pressedClass`).
      className={cx(box, pressed && pressedClass)}
    >
      {body}
    </Pressable>
  );
}
