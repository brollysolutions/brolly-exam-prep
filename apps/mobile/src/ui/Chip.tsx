import { colors } from '@tslprb/design-tokens';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

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
  shape = 'rect',
  onPress,
  disabled,
  className,
  style,
  ...rest
}: ChipProps) {
  const pressable = !!onPress && !disabled;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected: active, disabled: !!disabled }}
      android_ripple={
        pressable ? { color: active ? colors.pressTint : colors.hivisTint3 } : undefined
      }
      hitSlop={size === 'sm' ? 7 : size === 'md' ? 4 : 0}
      {...rest}
      disabled={!pressable}
      onPress={(e) => {
        haptics.tapLight();
        onPress?.(e);
      }}
      className={cx(
        'items-center justify-center border',
        shape === 'pill' ? 'rounded-full' : 'rounded-xs',
        height[size],
        active ? fill[tone] : 'border-line',
        disabled && 'opacity-40',
        className,
      )}
      style={({ pressed }) => [pressed && pressable ? { opacity: 0.85 } : null, style]}
    >
      <Text
        variant="small"
        weight={active ? '700' : '600'}
        color={active ? 'tar' : 'dim'}
        align="center"
      >
        {label}
      </Text>
    </Pressable>
  );
}
