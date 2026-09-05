import { colors, shadowStyle } from '@tslprb/design-tokens';
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
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type CardProps = Omit<PressableProps, 'style' | 'children'> & {
  selected?: boolean;
  title?: string;
  subtitle?: string;
  /** lg = post cards (19 px title), md = category grid (14.5 px title). */
  size?: 'md' | 'lg';
  /** Rendered after the content in reading order, vertically centred: a check, a pill, a chevron. */
  trailing?: ReactNode;
  /** No shadow: a card inside another surface, or one in a dense list. */
  flat?: boolean;
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The surface card: 1 px `line` on `surface` with the warm `card` shadow; selected = 2 px gold
 * border on a gold tint, title still ink. Pressed = `surface2` fill (see `pressedClass`).
 */
export function Card({
  selected = false,
  title,
  subtitle,
  size = 'lg',
  trailing,
  flat = false,
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
  // One fill slot: selected tint, pressed fill or the resting surface — never two `bg-*` classes.
  const fill = selected ? 'bg-accentTint' : pressed && !disabled ? pressedClass : 'bg-surface';
  const classes = cx(
    'justify-center rounded-md',
    // The grid card is shorter and tighter than the post card, so the box follows `size` too.
    md ? 'min-h-[72px]' : 'min-h-16',
    // Border grows 1 → 2 px when selected; padding gives the pixel back so content never shifts.
    selected
      ? cx('border-2 border-accent', md ? 'p-[11px]' : 'p-[15px]')
      : cx('border border-line', md ? 'p-3' : 'p-4'),
    fill,
    disabled && 'opacity-40',
    className,
  );
  const body = (
    <>
      {title !== undefined && (
        <Text variant={md ? 'bodyLg' : 'subtitle'} weight="700">
          {title}
        </Text>
      )}
      {subtitle !== undefined && (
        <Text
          variant={md ? 'caption' : 'small'}
          color="ink3"
          className={title !== undefined ? 'mt-1' : undefined}
        >
          {subtitle}
        </Text>
      )}
      {children}
    </>
  );
  const content =
    trailing === undefined || trailing === null ? (
      body
    ) : (
      <Row gap={3} align="center">
        <View className="flex-1">{body}</View>
        {trailing}
      </Row>
    );
  // Flattened on purpose: css-interop mutates array styles on web (see Text).
  const surface = StyleSheet.flatten([flat ? null : shadowStyle('card'), style]);
  // Static card (no onPress): a plain View, so it never reports a button/disabled state.
  if (!onPress) {
    return (
      <View
        accessibilityState={{ selected }}
        {...(rest as ViewProps)}
        className={classes}
        style={surface}
      >
        {content}
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !!disabled }}
      android_ripple={{ color: colors.accentTint }}
      {...rest}
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress(e);
      }}
      className={classes}
      style={surface}
    >
      {content}
    </Pressable>
  );
}
