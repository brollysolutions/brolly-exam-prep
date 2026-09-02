import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { cx } from './cx';
import { useMotion } from './motion';
import { Text } from './Text';

export type ToastProps = {
  text: string;
  /** hazard = 5-minute / locked-section notices, flag = last-minute warning. */
  tone?: 'hazard' | 'flag';
  testID?: string;
};

/** Full-width banner directly under the header. Slides down 180 ms. */
export function Toast({ text, tone = 'hazard', testID }: ToastProps) {
  const m = useMotion();
  return (
    <Animated.View
      testID={testID}
      entering={m.slideDown()}
      exiting={m.fadeOut()}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      {/* NativeWind does not style Animated.View; the surface is a plain View. */}
      <View className={cx('px-3 py-2', tone === 'flag' ? 'bg-flag' : 'bg-hazard')}>
        <Text variant="small" weight="600" color="tar">
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}
