import { spacing, type ColorName } from '@tslprb/design-tokens';
import { dir, useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { cx } from './cx';
import { Row } from './Row';
import { Text } from './Text';

/**
 * `quiet` is the default label (a section name, a step, a state); `gold` marks the candidate's
 * own input or the active thing; `ink` is a deliberate flag; `danger` is the quiet pill whose
 * WORD is the warning — the dialog tone on a destructive ask or an auto-submit.
 *
 * The vocabulary is the app's: gold = mine / active, ink = flagged, red = critical. A pill
 * never FILLS itself red or green — a verdict you can press and count is a `Chip`; `danger`
 * keeps the quiet `surface2` box and spends the red on the label (5.35:1) and the dot.
 */
export type PillTone = 'quiet' | 'gold' | 'ink' | 'danger';

/**
 * What the dot says, independently of the fill: `gold` is the default status mark (mine /
 * active), `danger` a failure, `ok` a pass, `none` no status at all — a heading that names a
 * block is not a state, so it draws no dot (ruling M14).
 */
export type PillDotTone = 'gold' | 'danger' | 'ok' | 'none';

export type PillProps = Omit<ViewProps, 'style' | 'children'> & {
  /**
   * The pill's text. A `<Trans>` where the line interpolates a `<Num>` (the OTP dev-code
   * hint); omitted where a `leading` `<Num>` is the whole content (a step counter).
   */
  label?: ReactNode;
  tone?: PillTone;
  /**
   * How the capsule sits in the column around it. A pill hugs its label, so it has to opt out
   * of a `Stack`'s stretch itself: `start` (the default) hugs the reading edge, `center` hugs
   * the middle of a centred block (a slide, an empty state).
   */
  align?: 'start' | 'center';
  /** The 6 px status dot before the label. */
  dot?: boolean;
  /** The dot's colour. The fill never moves with it. */
  dotTone?: PillDotTone;
  /**
   * Rendered before the label (and the dot), inside the same box: a `<Num>` for a step
   * counter or a date. Composing beats interpolation — a digit baked into a translated
   * string can never be tabular or LTR-isolated.
   */
  leading?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Fill + boundary per tone. One `bg-*` class each: a pill has no pressed state to swap to.
 *
 * On `quiet` the `surface2` fill is what separates the capsule from the cream (1.08:1 — quiet
 * on purpose, since a label must not out-shout what it names); the `line` hairline is texture
 * over that edge, not the edge itself (1.07:1 on the fill, 1.15:1 on the canvas). A pill that
 * has to be found rather than read takes `gold`, whose `accentStrong` edge clears 3:1.
 */
const box: Record<PillTone, string> = {
  quiet: 'bg-surface2 border-line',
  gold: 'bg-accentTint border-accentStrong',
  ink: 'bg-ink border-ink',
  // The same quiet box as `quiet`: red is the word, not the fill.
  danger: 'bg-surface2 border-line',
};

/**
 * Label colour. Gold is never text: on the gold tint the label is ink (14:1), and the tint plus
 * the edge carry the meaning instead. Red is the one colour a pill spends on its LABEL, because
 * `danger` exists for the cards where the word itself is the warning: `dangerInk` on `surface2`
 * is 5.35:1, where the `ink3` it replaced was 4.66 and said nothing (fix wave 1, C2).
 */
const fg: Record<PillTone, ColorName> = {
  quiet: 'ink3',
  gold: 'ink',
  ink: 'onInk',
  danger: 'dangerInk',
};

/**
 * The dot is non-text, so it may be a fill colour — but it still has to be found on the pill
 * it sits on: the deep shades on cream (`accentStrong` 3.4:1, `dangerInk` 5.4:1, `okInk`
 * 5.9:1) and the bright ones on the ink fill (`accent`, `danger` 6.1:1, `ok` 7.4:1).
 */
const dotColor: Record<Exclude<PillDotTone, 'none'>, Record<PillTone, string>> = {
  gold: {
    quiet: 'bg-accentStrong',
    gold: 'bg-accentStrong',
    ink: 'bg-accent',
    danger: 'bg-accentStrong',
  },
  danger: { quiet: 'bg-dangerInk', gold: 'bg-dangerInk', ink: 'bg-danger', danger: 'bg-dangerInk' },
  ok: { quiet: 'bg-okInk', gold: 'bg-okInk', ink: 'bg-ok', danger: 'bg-okInk' },
};

/**
 * Never a fixed height: a tall face at pill size is a line box plus overhang, so the box grows
 * with the Telugu label instead of clipping it (the fixed-chip defect, F-23-25 design review).
 */
const MIN_HEIGHT = spacing['6'];

/**
 * The label that introduces a block, names a state, or counts a step — the `Kicker` row and the
 * old `Chip` `label` tag rolled into one shape. That tone is gone (Phase E, F-32): a `Chip` is
 * always a bordered control or badge, and the quiet tag is this.
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
  align = 'start',
  dot = false,
  dotTone = 'gold',
  leading,
  className,
  style,
  ...rest
}: PillProps) {
  const d = useDir();
  return (
    <View
      {...rest}
      className={cx(
        // One alignment slot: `self-start` and `self-center` would otherwise both be emitted.
        // `self-start` is physical, so the reading edge goes through `dir()`.
        align === 'center' ? 'self-center' : dir(d, 'self-start', 'self-end'),
        'rounded-full border px-2 py-0.5',
        box[tone],
        className,
      )}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([{ minHeight: MIN_HEIGHT, justifyContent: 'center' }, style])}
    >
      <Row gap={1} align="center">
        {leading}
        {dot && dotTone !== 'none' && (
          <View
            testID={rest.testID ? `${rest.testID}-dot` : undefined}
            className={cx('h-1.5 w-1.5 rounded-full', dotColor[dotTone][tone])}
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
