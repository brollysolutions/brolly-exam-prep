import { shadowStyle, type ColorName } from '@tslprb/design-tokens';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from './Button';
import { Kicker } from './Kicker';
import { useMotion } from './motion';
import { Row } from './Row';
import { Stack } from './Stack';
import { StatTile } from './StatTile';
import { Text } from './Text';

/** `accent` asks (submit, resume), `danger` reports (auto-submit). `hivis`/`hazard`/`flag` are the old names. */
export type DialogTone = 'accent' | 'danger' | 'hivis' | 'hazard' | 'flag';
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

const kickerColor = (tone: DialogTone): ColorName => (tone === 'flag' || tone === 'danger' ? 'dangerInk' : 'accentInk');

/**
 * Bottom-anchored confirmation card over a warm scrim: `surface`, `lg` corners, 3 px gold top
 * edge, cast on the sheet shadow. Render it last inside a `Screen`.
 */
// TODO(follow-up): `onDismiss` — hardware back (BackHandler) and a scrim tap should close the
// card. Today every caller wires its own `BackHandler` listener and the scrim is inert, so the
// only way out is a button. Add the prop here and drop the per-screen listeners.

export function Dialog({
  visible,
  tone = 'accent',
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
        {/* The top edge is always gold; the kicker carries the tone. */}
        <View
          testID={testID ? `${testID}-card` : undefined}
          className="rounded-lg border border-line border-t-3 border-t-accentStrong bg-surface p-4"
          style={shadowStyle('sheet')}
        >
          <Kicker color={kickerColor(tone)}>{kicker}</Kicker>
          <Text variant="subtitle" weight="600" className="mt-2">
            {title}
          </Text>
          <Text variant="body" color="ink2" className="mt-2">
            {body}
          </Text>
          {stats && stats.length > 0 && (
            <Row gap={2} className="mt-3">
              {stats.map((s) => (
                <StatTile key={s.label} value={s.num} label={s.label} align="center" />
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
