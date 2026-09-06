import { colors, size } from '@tslprb/design-tokens';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cx } from './cx';

export type HeaderBandProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The critical-time band: a 4 px `dangerInk` rule laid across the top of the attempt header
 * while the clock is inside its last minute.
 *
 * It replaces `Screen rail critical`, the pulsing gold-turned-red rule that used to be screen
 * chrome (ruling 2026-09-05, Phase D). Three things say "critical" at once and none of them
 * moves: this band, the solid red timer box and the red progress fill, with the pinned
 * one-minute toast and its haptic carrying the words. Because nothing animates there is no
 * reduced-motion branch to get wrong, and no 700 ms loop on the UI thread for the last minute
 * of a paper — the minute a candidate can least afford a dropped frame.
 *
 * The fill is an object style rather than a class so it survives css-interop on web and stays
 * assertable; the band is hidden from screen readers, which hear the toast instead.
 */
export function HeaderBand({ className, style, testID = 'header-band' }: HeaderBandProps) {
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cx(className)}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([{ height: size.band, backgroundColor: colors.dangerInk }, style])}
    />
  );
}
