import { shadowStyle } from '@tslprb/design-tokens';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { cx } from './cx';
import { useMotion } from './motion';
import { Text } from './Text';

/**
 * `accent` = 5-minute notice (soft gold, ink text), `danger` = last-minute warning (solid
 * `dangerInk`, cream text — the same pair as the ≤ 60 s timer, never `danger` with cream at
 * 2.5:1), `info` = a locked section (ink fill, cream text).
 *
 * The pre-rebrand names `hazard` and `flag` were retired in Phase E (F-32); the attempt
 * screen's three call sites moved to `accent` / `danger` / `info` in Phase D.
 */
export type ToastTone = 'accent' | 'danger' | 'info';

export type ToastProps = {
  text: string;
  tone?: ToastTone;
  testID?: string;
};

const fill: Record<ToastTone, string> = {
  accent: 'bg-accentSoft',
  danger: 'bg-dangerInk',
  info: 'bg-ink',
};

/** Floating card directly under the header, 16 px inset, raised on the warm shadow. Slides down 180 ms. */
export function Toast({ text, tone = 'accent', testID }: ToastProps) {
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
      <View
        testID={testID ? `${testID}-card` : undefined}
        className={cx('mx-4 rounded-md px-3 py-2', fill[tone])}
        style={shadowStyle('raised')}
      >
        <Text variant="small" weight="600" color={tone === 'accent' ? 'ink' : 'onInk'}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}
