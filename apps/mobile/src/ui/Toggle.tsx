import { colors, radius, size } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import * as haptics from './haptics';
import { pressedStyle, usePressed } from './pressable';

export type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Announced by the screen reader; the row that owns the toggle usually supplies it. */
  accessibilityLabel?: string;
  disabled?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const TRACK_W = 52;
const TRACK_H = 32;
const THUMB = 26;
const INSET = (TRACK_H - THUMB) / 2;

/**
 * The on/off switch, in the app's own vocabulary: a round gold track with an ink thumb when
 * on, a `surface2` track in a `line2` ring with an ink3 thumb when off.
 *
 * RN's `Switch` draws its thumb in the platform's Material palette — a teal pill on a cream
 * screen (design review round 1). Every value here comes from the tokens, and the thumb
 * travels toward the reading end (under RTL "on" would be on the left).
 *
 * Colours live in a flattened style object rather than `className`: they change with `value`,
 * and a class list that changes between renders accumulates on web (see `Text`).
 */
export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
  disabled = false,
  testID,
  style,
}: ToggleProps) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  // `left`/`right`, not `start`/`end`: RN resolves those from I18nManager, not the in-app
  // language, and this app switches language live without a restart.
  const offset = value ? TRACK_W - THUMB - INSET : INSET;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      android_ripple={{ color: colors.accentTint, borderless: true, radius: size.touch / 2 }}
      // The track is 32 px tall; the slop brings the target to the 48 px minimum without
      // making the switch itself look like a button.
      hitSlop={{ top: 8, bottom: 8, left: 0, right: 0 }}
      disabled={disabled}
      onPress={() => {
        haptics.select();
        onValueChange(!value);
      }}
      {...handlers}
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([
        {
          width: TRACK_W,
          height: TRACK_H,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: value ? colors.accent : colors.line2,
          backgroundColor: value ? colors.accent : colors.surface2,
          opacity: disabled ? 0.4 : pressed ? pressedStyle.opacity : 1,
          justifyContent: 'center',
        },
        style,
      ])}
    >
      <View
        testID={testID ? `${testID}-thumb` : undefined}
        style={{
          position: 'absolute',
          [d.pick('left', 'right')]: offset,
          width: THUMB,
          height: THUMB,
          borderRadius: radius.full,
          backgroundColor: value ? colors.ink : colors.ink3,
        }}
      />
    </Pressable>
  );
}
