import { motion, size } from '@tslprb/design-tokens';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cx } from './cx';
import { useReducedMotionSafe } from './motion';

export type RailTone = 'accent' | 'danger';

export type RailProps = {
  /** Gold by default; red for the critical-time warning. `critical` alone implies `danger`. */
  tone?: RailTone;
  /**
   * The < 60 s state: the rule pulses (opacity, on the UI thread) unless the system asks for
   * reduced motion, in which case the red tone alone carries the warning.
   */
  critical?: boolean;
};

/** Pulse floor: the rule never fades out, it breathes. */
const PULSE_MIN = 0.35;

/**
 * The 3 px brand rule that replaced the hazard stripe: a solid gold line at the top of a
 * surface, red while the attempt clock is critical.
 */
export function Rail({ tone, critical = false }: RailProps) {
  const resolved: RailTone = tone ?? (critical ? 'danger' : 'accent');
  const reduced = useReducedMotionSafe();
  const animate = critical && !reduced;
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (animate) {
      opacity.set(
        withRepeat(
          withTiming(PULSE_MIN, { duration: motion.pulse, easing: Easing.inOut(Easing.ease) }),
          -1,
          true,
        ),
      );
    } else {
      cancelAnimation(opacity);
      opacity.set(1);
    }
    return () => cancelAnimation(opacity);
  }, [animate, opacity]);

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    // Animated.View is not wrapped by NativeWind: layout stays inline, the colour on a child.
    <Animated.View
      testID="rail"
      style={[{ height: size.rail }, pulse]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View
        testID="rail-fill"
        className={cx('flex-1', resolved === 'danger' ? 'bg-dangerInk' : 'bg-accentStrong')}
      />
    </Animated.View>
  );
}
