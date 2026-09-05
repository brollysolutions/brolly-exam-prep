import { spacing, type ColorName } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { cx } from './cx';
import { Row } from './Row';
import { Text } from './Text';

/**
 * `quiet` is the default label (a section name, a step, a state); `gold` marks the candidate's
 * own input or the active thing; `ink` is a deliberate flag. The vocabulary is the app's:
 * gold = mine / active, ink = flagged, and nothing here is ever red or green — a verdict is a
 * `Chip`, which can be pressed and can carry a count.
 */
export type PillTone = 'quiet' | 'gold' | 'ink';

export type PillProps = Omit<ViewProps, 'style' | 'children'> & {
  /**
   * The pill's text. A `<Trans>` where the line interpolates a `<Num>` (the OTP dev-code
   * hint); omitted where a `leading` `<Num>` is the whole content (a step counter).
   */
  label?: ReactNode;
  tone?: PillTone;
  /** The 6 px status dot before the label. */
  dot?: boolean;
  /**
   * Rendered before the label (and the dot), inside the same box: a `<Num>` for a step
   * counter or a date. Composing beats interpolation — a digit baked into a translated
   * string can never be tabular or LTR-isolated.
   */
  leading?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Fill + boundary per tone. One `bg-*` class each: a pill has no pressed state to swap to. */
const box: Record<PillTone, string> = {
  quiet: 'bg-surface2 border-line',
  gold: 'bg-accentTint border-accentStrong',
  ink: 'bg-ink border-ink',
};

/**
 * Label colour. Gold is never text: on the gold tint the label is ink (14:1), and the tint plus
 * the edge carry the meaning instead.
 */
const fg: Record<PillTone, ColorName> = { quiet: 'ink3', gold: 'ink', ink: 'onInk' };

/** The dot is non-text, so it may be gold: `accentStrong` on cream (3.4:1), `accent` on ink. */
const dotColor: Record<PillTone, string> = {
  quiet: 'bg-accentStrong',
  gold: 'bg-accentStrong',
  ink: 'bg-accent',
};

/**
 * Never a fixed height: a tall face at pill size is a line box plus overhang, so the box grows
 * with the Telugu label instead of clipping it (the fixed-chip defect, F-23-25 design review).
 */
const MIN_HEIGHT = spacing['6'];

/**
 * The label that introduces a block, names a state, or counts a step — the `Kicker` row and the
 * `Chip tone="label"` tag rolled into one shape.
 *
 * It is a label, never a control: there is no `onPress` and no pressed state. A pressable
 * filter is `Chip shape="pill"`, which reports a button role and a selected state.
 *
 * The label is `caption` (12 px), not the 10.5 px kicker: `ink3` is 4.7:1 on `surface2` and
 * nothing at that ratio may go below caption size (`.claude/rules/mobile-ui.md`).
 */
export function Pill({
  label,
  tone = 'quiet',
  dot = false,
  leading,
  className,
  style,
  ...rest
}: PillProps) {
  return (
    <View
      {...rest}
      className={cx('self-start rounded-full border px-2 py-0.5', box[tone], className)}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([{ minHeight: MIN_HEIGHT, justifyContent: 'center' }, style])}
    >
      <Row gap={1} align="center">
        {leading}
        {dot && (
          <View
            testID={rest.testID ? `${rest.testID}-dot` : undefined}
            className={cx('h-1.5 w-1.5 rounded-full', dotColor[tone])}
          />
        )}
        {label !== undefined && (
          <Text variant="caption" weight="700" color={fg[tone]} tracking="kicker">
            {label}
          </Text>
        )}
      </Row>
    </View>
  );
}
