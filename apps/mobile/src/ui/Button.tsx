import { colors, type ColorName } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { cx } from './cx';
import * as haptics from './haptics';
import { Row } from './Row';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'hazard';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  /** md = 48 px (secondary actions), lg = 56 px (the one primary action per screen). */
  size?: ButtonSize;
  /** Hazard variant only: filled state (e.g. "Marked"). */
  active?: boolean;
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
  hazard: 'border border-hazard',
};

const fg: Record<ButtonVariant, ColorName> = {
  primary: 'tar',
  secondary: 'chalk',
  ghost: 'dim',
  danger: 'white',
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
  icon,
  disabled,
  onPress,
  className,
  style,
  ...rest
}: ButtonProps) {
  const filledHazard = variant === 'hazard' && active;
  const primaryDisabled = disabled && variant === 'primary';
  const color: ColorName = primaryDisabled ? 'ghost' : filledHazard ? 'tar' : fg[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      android_ripple={{ color: ripple(variant, active) }}
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress?.(e);
      }}
      className={cx(
        'items-center justify-center rounded-sm px-4',
        size === 'lg' ? 'h-touchLg' : 'h-touch',
        primaryDisabled
          ? 'bg-panel3'
          : filledHazard
            ? 'bg-hazard border border-hazard'
            : box[variant],
        disabled && !primaryDisabled && 'opacity-40',
        className,
      )}
      style={({ pressed }) => [pressed && !disabled ? { opacity: 0.85 } : null, style]}
    >
      <Row gap={2} align="center">
        <Text
          variant={size === 'lg' ? 'bodyLg' : 'body'}
          weight={size === 'lg' ? '700' : '600'}
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
