import { colors, size as sizes, type ColorName, type FontWeight } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { pressedClass, pressedStyle, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

/**
 * `primary` is the one ink fill per screen. `secondary` and `ghost` are the quiet pair.
 * `danger` asks in a red outline (the app never commits in solid red). `accent` is the gold
 * outline that fills when `active` — the attempt screen's Mark button.
 * `dangerOutline` and `hazard` are the old names of `danger` and `accent`, kept one cycle.
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'accent'
  | 'dangerOutline'
  | 'hazard';
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  /** md = 48 px (secondary actions), lg = 56 px (the one primary action per screen). */
  size?: ButtonSize;
  /** Accent variant only: filled state (e.g. "Marked"). */
  active?: boolean;
  /**
   * Overrides the size's default label weight (md 600, lg 700). For a pair of same-variant
   * buttons where one leads: the screen keeps its single ink fill and the weight, not a
   * second fill, says which of the two is the main move.
   */
  weight?: FontWeight;
  /** Optional glyph/icon rendered after the label in reading order. */
  icon?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const canonical = (v: ButtonVariant): Variant =>
  v === 'dangerOutline' ? 'danger' : v === 'hazard' ? 'accent' : v;

const box: Record<Variant, string> = {
  primary: 'bg-ink',
  secondary: 'border border-line2',
  ghost: '',
  danger: 'border border-dangerInk',
  accent: 'border border-accentStrong',
};

const fg: Record<Variant, ColorName> = {
  primary: 'onInk',
  secondary: 'ink',
  ghost: 'ink2',
  danger: 'dangerInk',
  accent: 'accentInk',
};

/** Ripple tint per surface: cream on the ink fill, ink on the gold fill, gold tint on cream. */
const ripple = (variant: Variant, active: boolean) =>
  variant === 'primary'
    ? colors.pressTintOnDark
    : variant === 'accent' && active
      ? colors.pressTint
      : colors.accentTint;

export function Button({
  label,
  variant: variantProp = 'primary',
  size = 'md',
  active = false,
  weight,
  icon,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  className,
  style,
  ...rest
}: ButtonProps) {
  const { pressed, handlers } = usePressed(onPressIn, onPressOut);
  const variant = canonical(variantProp);
  const filledAccent = variant === 'accent' && active;
  const filled = variant === 'primary' || filledAccent;
  const primaryDisabled = disabled && variant === 'primary';
  const color: ColorName = primaryDisabled ? 'ink4' : filledAccent ? 'ink' : fg[variant];
  // The resting fill and the pressed fill are one slot: never two `bg-*` classes at once.
  const surface = primaryDisabled
    ? 'bg-surface2'
    : filledAccent
      ? 'bg-accent border border-accent'
      : pressed && !disabled && !filled
        ? cx(pressedClass, box[variant])
        : box[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: ripple(variant, active) }}
      {...rest}
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress?.(e);
      }}
      className={cx(
        'items-center justify-center rounded-sm px-4',
        surface,
        disabled && !primaryDisabled && 'opacity-40',
        className,
      )}
      // One flattened object, never a callback: see `usePressed`. The height lives here rather
      // than in a class so it survives css-interop on web and is assertable in tests.
      style={StyleSheet.flatten([
        { height: size === 'lg' ? sizes.touchLg : sizes.touch },
        style,
        pressed && !disabled && filled ? pressedStyle : null,
      ])}
    >
      <Row gap={2} align="center">
        <Text
          variant={size === 'lg' ? 'bodyLg' : 'body'}
          weight={weight ?? (size === 'lg' ? '700' : '600')}
          color={color}
          align="center"
        >
          {label}
        </Text>
        {icon}
      </Row>
    </Pressable>
  );
}
