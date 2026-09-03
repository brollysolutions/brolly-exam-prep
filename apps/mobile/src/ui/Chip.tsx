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
import { usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

/**
 * `label` is the odd one out: not a fill for an active chip but a whole other shape — the
 * small quiet tag on a card ("Sample data", a notice's kind). It is never a control.
 */
export type ChipTone = 'hivis' | 'hazard' | 'flag' | 'sand' | 'label';
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
   * Present but not yet available (a locked section tab): `mute` label instead of `dim`.
   * Unlike `disabled` it stays pressable, because the tap is what raises the locked toast.
   */
  muted?: boolean;
  shape?: 'rect' | 'pill';
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const fill: Record<Exclude<ChipTone, 'label'>, string> = {
  hivis: 'bg-hivis border-hivis',
  hazard: 'bg-hazard border-hazard',
  flag: 'bg-flag border-flag',
  sand: 'bg-sand border-sand',
};

/**
 * Minimum heights with vertical padding, never a fixed box: Nastaliq at chip size is a
 * 27.7 px line box plus overhang, and a fixed 34 px chip drew its ink above its own border
 * (design review, F-23-25). Latin and Telugu still land on 34 / 40 / 48.
 */
const height: Record<ChipSize, string> = {
  sm: 'min-h-chip py-1 px-3',
  md: 'min-h-chipMd py-1.5 px-4',
  lg: 'min-h-touch py-2 px-4',
};

/**
 * The tag tone: a kicker on `panel3` with no border and no yellow, ~18 px tall in Latin, so a
 * "Sample data" tag reads quieter than the heading it sits beside and a notice's kind chip
 * stops out-shouting the notice.
 */
function LabelChip({
  label,
  className,
  style,
  ...rest
}: Pick<ChipProps, 'label' | 'className' | 'style'> & ViewProps) {
  return (
    <View {...rest} className={cx('rounded-xs bg-panel3 px-2 py-0.5', className)} style={style}>
      <Text variant="kicker" weight="700" color="dim" align="center">
        {label}
      </Text>
    </View>
  );
}

/** Filter / status chip. Static when no `onPress` (e.g. the "Marked" badge). */
export function Chip({
  label,
  leading,
  count,
  active = false,
  tone = 'hivis',
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
  if (tone === 'label') {
    // A tag is not a control whatever it is handed: the press stays with the card around it.
    return <LabelChip {...(rest as ViewProps)} label={label} className={className} style={style} />;
  }
  const classes = cx(
    'items-center justify-center border',
    shape === 'pill' ? 'rounded-full' : 'rounded-xs',
    height[size],
    active ? fill[tone] : 'border-line',
    disabled && 'opacity-40',
    className,
  );
  const weight = active ? '700' : '600';
  const color: ColorName = active ? 'tar' : muted ? 'mute' : 'dim';
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
  // Static badge (e.g. "Marked"): a plain View, so it never reports a button/disabled state.
  if (!onPress) {
    return (
      <View
        accessibilityState={{ selected: active }}
        {...(rest as ViewProps)}
        className={classes}
        style={style}
      >
        {text}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: !!disabled }}
      android_ripple={{ color: active ? colors.pressTint : colors.hivisTint3 }}
      hitSlop={size === 'sm' ? 7 : size === 'md' ? 4 : 0}
      {...rest}
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.tapLight();
        onPress(e);
      }}
      className={classes}
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([style, pressed && !disabled ? { opacity: 0.85 } : null])}
    >
      {text}
    </Pressable>
  );
}
