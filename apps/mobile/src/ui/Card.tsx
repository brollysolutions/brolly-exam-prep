import { colors } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
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
  const classes = cx(
    'min-h-16 justify-center rounded-md',
    // Border grows 1 → 2 px when selected; padding gives the pixel back so content never shifts.
    selected ? 'border-2 border-hivis bg-hivisTint p-[15px]' : 'border border-line bg-panel2 p-4',
    disabled && 'opacity-40',
    className,
  );
  const content = (
    <>
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
    </>
  );
  // Static card (no onPress): a plain View, so it never reports a button/disabled state.
  if (!onPress) {
    return (
      <View
        accessibilityState={{ selected }}
        {...(rest as ViewProps)}
        className={classes}
        style={style}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      android_ripple={{ color: colors.hivisTint3 }}
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress(e);
      }}
      className={classes}
      style={({ pressed }) => [pressed && !disabled ? { opacity: 0.85 } : null, style]}
    >
      {content}
    </Pressable>
  );
}
