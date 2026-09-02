import { colors } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { Text } from './Text';

export type CardProps = Omit<PressableProps, 'style' | 'children'> & {
  selected?: boolean;
  title?: string;
  subtitle?: string;
  /** lg = post cards (19 px title), md = category grid (14.5 px title). */
  size?: 'md' | 'lg';
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** Selectable card: 1 px `line` border on `panel2`; selected = 2 px hi-vis border on a hi-vis tint. */
export function Card({
  selected = false,
  title,
  subtitle,
  size = 'lg',
  children,
  onPress,
  disabled,
  className,
  style,
  ...rest
}: CardProps) {
  const pressable = !!onPress && !disabled;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ selected, disabled: !!disabled }}
      android_ripple={pressable ? { color: colors.hivisTint3 } : undefined}
      {...rest}
      disabled={!pressable}
      onPress={(e) => {
        haptics.select();
        onPress?.(e);
      }}
      className={cx(
        'min-h-16 justify-center rounded-md',
        // Border grows 1 → 2 px when selected; padding gives the pixel back so content never shifts.
        selected
          ? 'border-2 border-hivis bg-hivisTint p-[15px]'
          : 'border border-line bg-panel2 p-4',
        disabled && 'opacity-40',
        className,
      )}
      style={({ pressed }) => [pressed && pressable ? { opacity: 0.85 } : null, style]}
    >
      {title !== undefined && (
        <Text
          variant={size === 'lg' ? 'subtitle' : 'bodyLg'}
          weight="700"
          color={selected ? 'hivis' : 'chalk'}
        >
          {title}
        </Text>
      )}
      {subtitle !== undefined && (
        <Text
          variant={size === 'lg' ? 'small' : 'caption'}
          color="dim"
          className={title !== undefined ? 'mt-1' : undefined}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </Pressable>
  );
}
