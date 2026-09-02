import { colors } from '@tslprb/design-tokens';
import {
  Pressable,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { Text } from './Text';

export type ChipTone = 'hivis' | 'hazard' | 'flag' | 'sand';
export type ChipSize = 'sm' | 'md' | 'lg';

export type ChipProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  active?: boolean;
  tone?: ChipTone;
  /** sm = 34, md = 40, lg = 48 px. */
  size?: ChipSize;
  /**
   * Present but not yet available (a locked section tab): `ghost` label instead of `dim`.
   * Unlike `disabled` it stays pressable, because the tap is what raises the locked toast.
   */
  muted?: boolean;
  shape?: 'rect' | 'pill';
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const fill: Record<ChipTone, string> = {
  hivis: 'bg-hivis border-hivis',
  hazard: 'bg-hazard border-hazard',
  flag: 'bg-flag border-flag',
  sand: 'bg-sand border-sand',
};

const height: Record<ChipSize, string> = {
  sm: 'h-chip px-3',
  md: 'h-chipMd px-4',
  lg: 'h-touch px-4',
};

/** Filter / status chip. Static when no `onPress` (e.g. the "Marked" badge). */
export function Chip({
  label,
  active = false,
  tone = 'hivis',
  size = 'sm',
  muted = false,
  shape = 'rect',
  onPress,
  disabled,
  className,
  style,
  ...rest
}: ChipProps) {
  const classes = cx(
    'items-center justify-center border',
    shape === 'pill' ? 'rounded-full' : 'rounded-xs',
    height[size],
    active ? fill[tone] : 'border-line',
    disabled && 'opacity-40',
    className,
  );
  const text = (
    <Text
      variant="small"
      weight={active ? '700' : '600'}
      color={active ? 'tar' : muted ? 'ghost' : 'dim'}
      align="center"
    >
      {label}
    </Text>
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
      disabled={disabled}
      onPress={(e) => {
        haptics.tapLight();
        onPress(e);
      }}
      className={classes}
      style={({ pressed }) => [pressed && !disabled ? { opacity: 0.85 } : null, style]}
    >
      {text}
    </Pressable>
  );
}
