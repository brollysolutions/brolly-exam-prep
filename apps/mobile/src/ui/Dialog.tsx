import { shadowStyle } from '@tslprb/design-tokens';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from './Button';
import { useMotion } from './motion';
import { Pill, type PillDotTone, type PillTone } from './Pill';
import { Row } from './Row';
import { Stack } from './Stack';
import { StatTile } from './StatTile';
import { Text } from './Text';

/**
 * `accent` asks (exit, submit, resume), `danger` reports (auto-submit). The pre-rebrand
 * names `hivis`, `hazard` and `flag` were retired in Phase E (F-32).
 */
export type DialogTone = 'accent' | 'danger';
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

/**
 * The tone pill. A card that asks wears the gold tag — the candidate is about to do something
 * — and a `danger` card wears the quiet tag with a red dot AND red words: the fill stays quiet
 * because red is a verdict rather than a surface (the `LoadError` ruling, F-29 D7), but the
 * label is `dangerInk` (5.35:1 on `surface2`), not `ink3`.
 *
 * That `ink3` label was this phase's own regression: `danger` is worn by exactly two cards —
 * the auto-submit report and Profile's delete-account confirmation — and quietening the label
 * took the red words off the app's most destructive ASK (fix wave 1, C2). The exit card's gold
 * pill and this one stay clearly distinct: a different fill, a dot, and a different word colour.
 *
 * Gold is never the word: the `gold` pill's label is ink on the gold tint (14:1), where
 * `accentInk` on it measures 4.14 and on a quiet pill's `surface2` 4.25 — both under AA.
 */
const tonePill = (tone: DialogTone): { tone: PillTone; dot: boolean; dotTone: PillDotTone } =>
  tone === 'danger'
    ? { tone: 'danger', dot: true, dotTone: 'danger' }
    : { tone: 'gold', dot: false, dotTone: 'none' };

/**
 * Bottom-anchored confirmation card over a warm scrim: `surface`, `lg` corners, 3 px gold top
 * edge, cast on the sheet shadow. Render it last inside a `Screen`.
 *
 * The scrim and the card carry their own motion: the backdrop fades over 140 ms while the card
 * rises over 180 ms on the sheet curve, so the card arrives from the edge it is anchored to
 * instead of the whole overlay blinking on. Both go through `useMotion()`, which resolves to
 * `undefined` under reduced motion and leaves an instant change.
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
  const pill = tonePill(tone);
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
        {/* The card slides up out of the edge it is anchored to; the scrim above only fades. */}
        <Animated.View entering={m.slideUp()} exiting={m.slideOut()}>
          {/* The top edge is always gold; the pill carries the tone. */}
          <View
            testID={testID ? `${testID}-card` : undefined}
            className="rounded-lg border border-line border-t-3 border-t-accentStrong bg-surface p-4"
            style={shadowStyle('sheet')}
          >
            <Pill
              testID={testID ? `${testID}-pill` : undefined}
              label={kicker}
              tone={pill.tone}
              dot={pill.dot}
              dotTone={pill.dotTone}
            />
            {/* The display face: a dialog is the one thing on screen while it is open. */}
            <Text variant="title" className="mt-2">
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
              <Button
                size="lg"
                label={primary.label}
                onPress={primary.onPress}
                testID={testID ? `${testID}-primary` : undefined}
              />
              {secondary && (
                <Button
                  variant="secondary"
                  label={secondary.label}
                  onPress={secondary.onPress}
                  testID={testID ? `${testID}-secondary` : undefined}
                />
              )}
            </Stack>
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
