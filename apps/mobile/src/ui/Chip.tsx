import { colors, type ColorName } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { Num } from './Num';
import { pressedClass, pressedStyle, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

/**
 * Status vocabulary: `accent` (gold) is the candidate's own input or the active filter,
 * `danger` is wrong / unanswered, `ok` is eligible / correct. A `Chip` is always a control or
 * a badge with a boundary — **the quiet tag is `Pill`**, which draws the same label at the
 * caption size the contrast floor asks for.
 *
 * Phase E (F-32) deleted the `label` tone with the pre-rebrand names `hivis`, `hazard`, `sand`
 * (→ `accent`) and `flag` (→ `danger`). Phase C moved the last four product `label` call sites
 * to `Pill`; the gallery's own demo of it went with the tone.
 */
export type ChipTone = 'accent' | 'danger' | 'ok';
export type ChipSize = 'sm' | 'md' | 'lg';

export type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  /**
   * Rendered before the label, inside the same box: a `<Num>` for a score, a `Glyph` for a
   * lock. Composing beats interpolation, because a count baked into a translated sentence
   * can never be tabular or LTR-isolated.
   */
  leading?: ReactNode;
  /**
   * A tally after the label ("Wrong (3)"). Rendered as `<Num>` so the digits stay tabular
   * and LTR-isolated instead of being interpolated into the translated string.
   */
  count?: number;
  active?: boolean;
  tone?: ChipTone;
  /** sm ≥ 34, md ≥ 40, lg ≥ 48 px. */
  size?: ChipSize;
  /**
   * Present but not yet available (a locked section tab): the label steps down a weight
   * (600 → 500) and stays `ink3` — `ink4` is 2.8:1 and a locked tab still has to be read to be
   * understood as locked. Unlike `disabled` it stays pressable, because the tap is what raises
   * the locked toast.
   */
  muted?: boolean;
  shape?: 'rect' | 'pill';
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Active fills. Soft gold sits 1.38:1 from the canvas, so the selected accent chip also
 * carries a 2 px inner bottom edge in the 3.4:1 gold; the red and green tones already have a
 * boundary that reads (a 5.8:1 outline, a solid fill).
 */
const fill: Record<ChipTone, string> = {
  accent: 'bg-accentSoft border-accent border-b-2 border-b-accentStrong',
  danger: 'bg-dangerTint border-dangerInk',
  ok: 'bg-ok border-ok',
};

/** The rest boundary: `outline` (3.0:1) so a tappable filter reads as a control; `line2` is for dividers. */
const restBorder = 'border-outline';

/** Label colour on each active fill; ink reads on gold and green, red text on the red tint. */
const activeColor: Record<ChipTone, ColorName> = { accent: 'ink', danger: 'dangerInk', ok: 'ink' };

/**
 * Minimum heights with vertical padding, never a fixed box: a tall face at chip size is a
 * line box plus overhang, and a fixed 34 px chip drew its ink above its own border
 * (design review, F-23-25). Latin and Telugu land on 34 / 40 / 48.
 */
const height: Record<ChipSize, string> = {
  sm: 'min-h-chip py-1 px-3',
  md: 'min-h-chipMd py-1.5 px-4',
  lg: 'min-h-touch py-2 px-4',
};

/** Filter / status chip. Static when no `onPress` (e.g. the "Marked" badge). */
export function Chip({
  label,
  leading,
  count,
  active = false,
  tone = 'accent',
  size = 'sm',
  muted = false,
  shape = 'rect',
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  className,
  style,
  ...rest
}: ChipProps) {
  const { pressed, handlers } = usePressed(onPressIn, onPressOut);
  // One fill slot: the active fill, the pressed fill or a bare outline — never two `bg-*` classes.
  const surface = active
    ? fill[tone]
    : pressed && !disabled
      ? cx(pressedClass, restBorder)
      : restBorder;
  const classes = cx(
    'items-center justify-center border',
    shape === 'pill' ? 'rounded-full' : 'rounded-xs',
    height[size],
    surface,
    disabled && 'opacity-40',
    className,
  );
  const weight = active ? '700' : muted ? '500' : '600';
  const color: ColorName = active ? activeColor[tone] : 'ink3';
  const caption = (
    <Text variant="small" weight={weight} color={color} align="center">
      {label}
    </Text>
  );
  const tally =
    count === undefined ? null : (
      <Num variant="small" weight={weight} color={color}>
        {`(${count})`}
      </Num>
    );
  // A bare label stays a single Text so `toHaveTextContent` and the snapshots read cleanly;
  // only a composed chip pays for the extra Row.
  const text =
    leading || tally ? (
      <Row gap={1} align={leading ? 'center' : 'baseline'}>
        {leading}
        {caption}
        {tally}
      </Row>
    ) : (
      caption
    );
  // Static badge (e.g. "Marked"): a plain View, so it never reports a button, a disabled state
  // or a selection — a badge nobody can choose announcing "selected" is a lie (design review
  // D8). The word itself carries the meaning.
  if (!onPress) {
    return (
      <View {...(rest as ViewProps)} className={classes} style={style}>
        {text}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      android_ripple={{ color: active ? colors.pressTint : colors.accentTint }}
      hitSlop={size === 'sm' ? 7 : size === 'md' ? 4 : 0}
      {...rest}
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.tapLight();
        onPress(e);
      }}
      className={classes}
      // One flattened object, never a callback: see `usePressed`. A filled chip dims; an
      // outlined one swapped its fill above.
      style={StyleSheet.flatten([style, pressed && !disabled && active ? pressedStyle : null])}
    >
      {text}
    </Pressable>
  );
}
