import { colors, size } from '@tslprb/design-tokens';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { cx } from './cx';

export type HeaderBandProps = {
  /**
   * Whether the band is showing. The band is ALWAYS rendered and only its fill changes,
   * so the header does not move when the clock crosses the last minute — see below.
   */
  critical?: boolean;
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
 * It occupies its 4 px whether or not it is showing, and `critical` drives the FILL alone.
 * Mounted into flow at the sixty-second mark instead, it pushed the whole header — clock,
 * language switcher, section tabs — down by its own height at the exact moment a candidate
 * is reading the clock (measured: the header sat 4 px lower at 47 s than at 61 s; fix wave 1,
 * D10). A signal that moves the thing it is warning about is worse than no signal.
 *
 * The fill is an object style rather than a class so it survives css-interop on web and stays
 * assertable; the band is hidden from screen readers, which hear the toast instead.
 */
export function HeaderBand({
  critical = true,
  className,
  style,
  testID = 'header-band',
}: HeaderBandProps) {
  return (
    <View
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cx(className)}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([
        {
          height: size.band,
          backgroundColor: critical ? colors.dangerInk : 'transparent',
        },
        style,
      ])}
    />
  );
}
