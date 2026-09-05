import { shadowStyle, spacing } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cx } from './cx';
import { Row } from './Row';

export type ActionBarProps = {
  /**
   * Above the buttons, full width: the keypad on Login and OTP, a legend, a count. Omitted on
   * a screen whose bar is only its actions.
   */
  children?: ReactNode;
  /** The screen's one ink `Button size="lg"`. It takes the remaining width. */
  primary: ReactNode;
  /** Before the primary in reading order: Skip, Back, Clear — a ghost or an outline, never a fill. */
  secondary?: ReactNode;
  /**
   * The hairline over the bar AND the shadow it casts. On by default; a footer that ends a
   * full-bleed pager (Welcome) turns both off, because there is no scrolling content for the
   * line to separate it from — and a shadow with no line to cast it reads as a smudge.
   */
  bordered?: boolean;
  className?: string;
  testID?: string;
};

/** The bar's own padding under the actions, before the device's bottom inset is added. */
const PAD = spacing['4'];

/**
 * The sticky bottom bar that carries a screen's decision: a `surface` strip under a hairline,
 * lifted off the body by the sheet shadow cast upward.
 *
 * It sits OUTSIDE the screen's ScrollView, so the action is reachable without scrolling and the
 * body scrolls behind it. One filled control lives here per screen — the primary — and the
 * quiet partner beside it is an outline or a ghost.
 *
 * The bar owns the bottom safe-area inset (the tab bar's precedent, `(tabs)/_layout.tsx`): its
 * host passes `Screen bottomInset={false}`, so the strip runs to the bottom edge instead of
 * floating over a band of canvas the height of the home indicator.
 */
export function ActionBar({
  children,
  primary,
  secondary,
  bordered = true,
  className,
  testID,
}: ActionBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      testID={testID}
      className={cx('bg-surface px-4 pt-3', bordered && 'border-t border-line', className)}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([
        { paddingBottom: PAD + insets.bottom },
        bordered ? shadowStyle('sheet') : null,
      ])}
    >
      {children}
      <Row
        testID={testID ? `${testID}-row` : undefined}
        gap={3}
        align="center"
        className={children !== undefined ? 'mt-3' : undefined}
      >
        {secondary}
        <View className="flex-1">{primary}</View>
      </Row>
    </View>
  );
}
