import { colors, type ColorName } from '@tslprb/design-tokens';
import type { ViewStyle } from 'react-native';

/** The prototype's `border-inline-start: 3px` accents. */
export const EDGE_WIDTH = 3;

/**
 * A coloured bar on the reading-start side, as a flattened style object.
 *
 * Two rules meet here: RN's `borderStartWidth` follows `I18nManager`, not the in-app
 * language, so the physical side has to be resolved from `useDir()`; and on web a dynamic
 * `className` next to a `style` array accumulates stale classes, so the mirrored half of
 * the style must never be a class name.
 */
export function startEdge(isRTL: boolean, color: ColorName, width = EDGE_WIDTH): ViewStyle {
  return isRTL
    ? { borderRightWidth: width, borderRightColor: colors[color] }
    : { borderLeftWidth: width, borderLeftColor: colors[color] };
}
