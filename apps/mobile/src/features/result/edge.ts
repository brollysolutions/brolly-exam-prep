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

/**
 * The reading-side padding a box needs so a `startEdge` never pushes its content out of line
 * with the boxes around it.
 *
 * The bar REPLACES whatever boundary that side already had, so only the difference comes off
 * the padding: 3 px of gold over a `Card`'s own 1 px `line` is two pixels, not three.
 * Subtracting the whole edge is what left an open notice's pill on 16 px against a closed
 * card's 17 (fix wave 1, code review 1). `borderWidth` is what the box draws at rest — 0 for a
 * bare box such as a paper option, 1 for a card, 2 for a selected one.
 */
export function startEdgeInset(isRTL: boolean, pad: number, borderWidth = 0): ViewStyle {
  const inset = pad - (EDGE_WIDTH - borderWidth);
  return isRTL ? { paddingRight: inset } : { paddingLeft: inset };
}
