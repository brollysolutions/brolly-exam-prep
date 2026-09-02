import { hazard, motion } from '@tslprb/design-tokens';
import { useEffect } from 'react';
import { View, useWindowDimensions } from 'react-native';
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

export type HazardRailProps = {
  /** Flag-red stripes that marquee (unless reduced motion) — the < 60 s state. */
  critical?: boolean;
};

const PERIOD = hazard.period;
const STRIPE = hazard.stripe;
/** CSS `repeating-linear-gradient(115deg …)` ⇒ stripe edges lean 25° from vertical. */
const SKEW = `${hazard.angle - 90}deg`;
/** One marquee loop travels two periods; that is what the extra slices on the leading edge cover. */
const TRAVEL = PERIOD * 2;

/** The 5 px hazard stripe at the top of every screen, drawn with plain Views so it renders on native. */
export function HazardRail({ critical = false }: HazardRailProps) {
  const { width } = useWindowDimensions();
  const reduced = useReducedMotionSafe();
  const animate = critical && !reduced;
  const shift = useSharedValue(0);

  useEffect(() => {
    if (animate) {
      shift.set(0);
      shift.set(
        withRepeat(
          withTiming(TRAVEL, { duration: motion.marquee, easing: Easing.linear }),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(shift);
      shift.set(0);
    }
    return () => cancelAnimation(shift);
  }, [animate, shift]);

  const marquee = useAnimatedStyle(() => ({ transform: [{ translateX: shift.get() - TRAVEL }] }));

  const slices = (Math.ceil(width / PERIOD) + 4) * 2;
  const stripe = critical ? 'bg-flag' : 'bg-hivis';

  return (
    <View
      className="h-rail overflow-hidden bg-tar"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View className="flex-row" style={marquee}>
        {Array.from({ length: slices }, (_, i) => (
          <View
            key={i}
            className={cx('h-rail', i % 2 === 0 ? stripe : 'bg-tar')}
            style={{ width: STRIPE, transform: [{ skewX: `-${SKEW}` }] }}
          />
        ))}
      </Animated.View>
    </View>
  );
}
