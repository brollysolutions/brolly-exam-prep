import { colors } from '@tslprb/design-tokens';
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
import { usePressed } from './pressable';
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
  onPressIn,
  onPressOut,
  disabled,
  className,
  style,
  ...rest
}: CardProps) {
  const { pressed, handlers } = usePressed(onPressIn, onPressOut);
  const md = size === 'md';
  const classes = cx(
    'justify-center rounded-md',
    // The grid card is shorter and tighter than the post card, so the box follows `size` too.
    md ? 'min-h-[72px]' : 'min-h-16',
    // Border grows 1 → 2 px when selected; padding gives the pixel back so content never shifts.
    selected
      ? cx('border-2 border-hivis bg-hivisTint', md ? 'p-[11px]' : 'p-[15px]')
      : cx('border border-line bg-panel2', md ? 'p-3' : 'p-4'),
    disabled && 'opacity-40',
    className,
  );
  const content = (
    <>
      {title !== undefined && (
        <Text
          variant={md ? 'bodyLg' : 'subtitle'}
          weight="700"
          color={selected ? 'hivis' : 'chalk'}
        >
          {title}
        </Text>
      )}
      {subtitle !== undefined && (
        <Text
          variant={md ? 'caption' : 'small'}
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
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress(e);
      }}
      className={classes}
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([style, pressed && !disabled ? { opacity: 0.85 } : null])}
    >
      {content}
    </Pressable>
  );
}
