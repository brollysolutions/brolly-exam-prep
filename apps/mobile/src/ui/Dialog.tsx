import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from './Button';
import { cx } from './cx';
import { Kicker } from './Kicker';
import { useMotion } from './motion';
import { Num } from './Num';
import { Row } from './Row';
import { Stack } from './Stack';
import { Text } from './Text';

export type DialogTone = 'hivis' | 'hazard' | 'flag';
export type DialogAction = { label: string; onPress: () => void };
export type DialogStat = { num: string | number; label: string };

export type DialogProps = {
  visible: boolean;
  tone?: DialogTone;
  kicker: string;
  title: string;
  body: string;
  /** Equal-width tiles (answered / not answered / marked). */
  stats?: DialogStat[];
  primary: DialogAction;
  secondary?: DialogAction;
  testID?: string;
};

const edge: Record<DialogTone, string> = {
  hivis: 'border-t-hivis',
  hazard: 'border-t-hazard',
  flag: 'border-t-flag',
};

/** Bottom-anchored confirmation card over a heavy scrim. Render it last inside a `Screen`. */
export function Dialog({
  visible,
  tone = 'hivis',
  kicker,
  title,
  body,
  stats,
  primary,
  secondary,
  testID,
}: DialogProps) {
  const m = useMotion();
  if (!visible) return null;
  return (
    <Animated.View
      testID={testID}
      entering={m.fadeIn()}
      exiting={m.fadeOut()}
      accessibilityViewIsModal
      // NativeWind does not style Animated.View; it only carries the fill + animation.
      style={StyleSheet.absoluteFill}
    >
      <View className="flex-1 justify-end bg-scrimHeavy p-4">
        <View className={cx('border border-line border-t-4 bg-panel2 px-4 pb-4 pt-4', edge[tone])}>
          <Kicker color={tone}>{kicker}</Kicker>
          <Text variant="subtitle" weight="600" className="mt-2">
            {title}
          </Text>
          <Text variant="body" color="chalk2" className="mt-2">
            {body}
          </Text>
          {stats && stats.length > 0 && (
            <Row gap={2} className="mt-3">
              {stats.map((s) => (
                <View key={s.label} className="flex-1 items-center border border-line px-1 py-2">
                  <Num variant="stat" align="center">
                    {s.num}
                  </Num>
                  <Text variant="statLabel" color="steel" align="center" className="mt-1">
                    {s.label}
                  </Text>
                </View>
              ))}
            </Row>
          )}
          <Stack gap={2} className="mt-4">
            <Button size="lg" label={primary.label} onPress={primary.onPress} />
            {secondary && (
              <Button variant="secondary" label={secondary.label} onPress={secondary.onPress} />
            )}
          </Stack>
        </View>
      </View>
    </Animated.View>
  );
}
