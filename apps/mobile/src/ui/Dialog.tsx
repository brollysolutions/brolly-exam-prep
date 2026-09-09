import { shadowStyle } from '@tslprb/design-tokens';
import { useRef } from 'react';
import { AccessibilityInfo, Modal, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  /** Safe cancellation only. Never infer it from the potentially destructive actions. */
  onDismiss?: () => void;
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
export function Dialog({
  visible,
  tone = 'accent',
  kicker,
  title,
  body,
  stats,
  primary,
  secondary,
  onDismiss,
  testID,
}: DialogProps) {
  const m = useMotion();
  const heading = useRef<View>(null);
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  if (!visible) return null;
  const pill = tonePill(tone);
  return (
    <Modal
      testID={testID}
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => onDismiss?.()}
      onShow={() => {
        if (heading.current) AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
      }}
    >
      <View
        className="flex-1 justify-end bg-scrimHeavy px-4"
        style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
        accessibilityViewIsModal
      >
        {/* The card slides up out of the edge it is anchored to; the scrim above only fades. */}
        <Animated.View
          entering={m.slideUp()}
          exiting={m.slideOut()}
          style={{ maxHeight: height - insets.top - insets.bottom - 32 }}
        >
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
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
              <View ref={heading} accessible accessibilityRole="header" accessibilityLabel={title}>
                <Text variant="title" className="mt-2">
                  {title}
                </Text>
              </View>
              <Text variant="body" color="ink2" className="mt-2">
                {body}
              </Text>
              {stats && stats.length > 0 && (
                <Row
                  gap={2}
                  className="mt-3"
                  style={fontScale > 1.5 ? { flexDirection: 'column' } : undefined}
                >
                  {stats.map((s) => (
                    <StatTile
                      key={s.label}
                      value={s.num}
                      label={s.label}
                      align="center"
                      className={fontScale > 1.5 ? 'flex-none self-stretch' : undefined}
                    />
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
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
