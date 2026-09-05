import { shadowStyle } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';

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
   * The hairline over the bar. On by default; a footer that ends a full-bleed pager (Welcome)
   * turns it off, because there is no scrolling content for the line to separate it from.
   */
  bordered?: boolean;
  testID?: string;
};

/**
 * The sticky bottom bar that carries a screen's decision: a `surface` strip under a hairline,
 * lifted off the body by the sheet shadow cast upward.
 *
 * It sits OUTSIDE the screen's ScrollView, so the action is reachable without scrolling and the
 * body scrolls behind it. One filled control lives here per screen — the primary — and the
 * quiet partner beside it is an outline or a ghost.
 */
export function ActionBar({
  children,
  primary,
  secondary,
  bordered = true,
  testID,
}: ActionBarProps) {
  return (
    <View
      testID={testID}
      className={cx('bg-surface px-4 pb-4 pt-3', bordered && 'border-t border-line')}
      style={shadowStyle('sheet')}
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
