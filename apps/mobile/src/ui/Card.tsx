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
import { pressedClass, pressedStyle, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type CardProps = Omit<PressableProps, 'style' | 'children'> & {
  /**
   * Set it (either way) and the card becomes one option of a single-choice group: it reports
   * `radio` with a checked state, so a screen reader says which of the two posts is chosen.
   * Left off, the card is not a choice at all and announces nothing about selection (D8/D18).
   */
  selected?: boolean;
  title?: string;
  subtitle?: string;
  /** lg = post cards (19 px title), md = category grid (14.5 px title). */
  size?: 'md' | 'lg';
  /**
   * Corner. `md` (8 px) is the card radius the whole app rests on; `lg` (12 px) is the
   * single-choice step card, which the spec draws one step softer. One class slot, never two:
   * a second `rounded-*` on the same element lets Tailwind's emission order decide the corner.
   */
  radius?: 'md' | 'lg';
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
 * border on a gold tint, title still ink. Pressed = `surface2` fill (see `pressedClass`) — or,
 * when selected, the filled-control dim (`pressedStyle`), since swapping the tint for surface2
 * would erase the state the press is confirming.
 */
export function Card({
  selected,
  title,
  subtitle,
  size = 'lg',
  radius = 'md',
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
  // A choice at all? `undefined` is "this card is not an option", which is not the same thing
  // as an option nobody has picked.
  const choice = selected !== undefined;
  // One fill slot: selected tint, pressed fill or the resting surface — never two `bg-*` classes.
  const fill = selected ? 'bg-accentTint' : pressed && !disabled ? pressedClass : 'bg-surface';
  const classes = cx(
    'justify-center',
    radius === 'lg' ? 'rounded-lg' : 'rounded-md',
    // The grid card is shorter and tighter than the post card, so the box follows `size` too.
    md ? 'min-h-[72px]' : 'min-h-16',
    // Border grows 1 → 2 px when selected; padding gives the pixel back so content never shifts.
    // `accentStrong`, not `accent`: the brand gold is 2.34:1 on the cream around the card and
    // an edge that carries the state has to clear 3:1 (design review D2).
    selected
      ? cx('border-2 border-accentStrong', md ? 'p-[11px]' : 'p-[15px]')
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
  const surface = StyleSheet.flatten([
    flat ? null : shadowStyle('card'),
    style,
    selected && pressed && !disabled ? pressedStyle : null,
  ]);
  // Static card (no onPress): a plain View, so it never reports a button, a disabled state or
  // a selection — an announced "selected" on a card nobody can choose is a lie (D8).
  if (!onPress) {
    return (
      <View {...(rest as ViewProps)} className={classes} style={surface}>
        {content}
      </View>
    );
  }
  return (
    <Pressable
      // One of a set, or a plain button: `radio` + `checked` is what a screen reader needs to
      // say "2 of 2, selected" on the post and category steps (D18).
      accessibilityRole={choice ? 'radio' : 'button'}
      accessibilityState={
        choice ? { checked: !!selected, disabled: !!disabled } : { disabled: !!disabled }
      }
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
