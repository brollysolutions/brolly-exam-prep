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
import { usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'dangerOutline'
  | 'hazard';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  /** md = 48 px (secondary actions), lg = 56 px (the one primary action per screen). */
  size?: ButtonSize;
  /** Hazard variant only: filled state (e.g. "Marked"). */
  active?: boolean;
  /**
   * Overrides the size's default label weight (md 600, lg 700). For a pair of same-variant
   * buttons where one leads: the screen keeps its single hi-vis element and the weight, not
   * a second yellow fill, says which of the two is the main move.
   */
  weight?: FontWeight;
  /** Optional glyph/icon rendered after the label in reading order. */
  icon?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

const box: Record<ButtonVariant, string> = {
  primary: 'bg-hivis',
  secondary: 'border border-line3',
  ghost: '',
  danger: 'bg-flag',
  // Destructive but not yet destructive: the outlined form asks, the filled form commits.
  // A solid red button standing on a settings list reads as the screen's primary action.
  dangerOutline: 'border border-flag',
  hazard: 'border border-hazard',
};

const fg: Record<ButtonVariant, ColorName> = {
  primary: 'tar',
  secondary: 'chalk',
  ghost: 'dim',
  danger: 'white',
  dangerOutline: 'flag',
  hazard: 'hazard',
};

/** Ripple tint per surface: dark tint on hi-vis/hazard fills, yellow tint on dark surfaces. */
const ripple = (variant: ButtonVariant, active: boolean) =>
  variant === 'primary' || (variant === 'hazard' && active) ? colors.pressTint : colors.hivisTint3;

export function Button({
  label,
  variant = 'primary',
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
  const filledHazard = variant === 'hazard' && active;
  const primaryDisabled = disabled && variant === 'primary';
  const color: ColorName = primaryDisabled ? 'ghost' : filledHazard ? 'tar' : fg[variant];
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
        primaryDisabled
          ? 'bg-panel3'
          : filledHazard
            ? 'bg-hazard border border-hazard'
            : box[variant],
        disabled && !primaryDisabled && 'opacity-40',
        className,
      )}
      // One flattened object, never a callback: see `usePressed`. The height lives here rather
      // than in a class so it survives css-interop on web and is assertable in tests.
      style={StyleSheet.flatten([
        { height: size === 'lg' ? sizes.touchLg : sizes.touch },
        style,
        pressed && !disabled ? { opacity: 0.85 } : null,
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
