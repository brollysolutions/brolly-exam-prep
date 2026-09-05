import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { cx } from './cx';
import { Glyph } from './Glyph';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Text } from './Text';

export type BackHeaderProps = {
  title: string;
  onBack?: () => void;
  /**
   * After the title, at the end of the title row (a static "Sample data" pill). The row is a
   * `Row`, so under RTL it lands at the left edge without a mirrored class of its own.
   */
  trailing?: ReactNode;
  /** Second row inside the header bar (the solutions filter chips, the paper's sections). */
  children?: ReactNode;
  testID?: string;
};

/**
 * The leaf header: a 48 px chevron-back target and the screen's title on a `surface` bar with a
 * `line` under it. The title is Inter 600 on one line — a leaf screen is somewhere you arrived
 * from somewhere else, so the display face and its two-line allowance belong to `PageHeader`.
 *
 * The chevron is drawn `lang="en"` so it never depends on the language face carrying
 * U+2039/U+203A, and the back target fills `surface2` while held: an opacity dim is invisible
 * between two creams (`pressedClass`).
 */
export function BackHeader({ title, onBack, trailing, children, testID }: BackHeaderProps) {
  const d = useDir();
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  return (
    <View className="border-b border-line bg-surface">
      <Row align="center" gap={1} className="px-2 py-1" testID={testID}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          android_ripple={{ color: colors.accentTint }}
          onPress={onBack}
          {...handlers}
          className={cx(
            'h-touch w-touch items-center justify-center rounded-sm',
            pressed && pressedClass,
          )}
          testID={testID ? `${testID}-back` : undefined}
        >
          {/* `ink2`, not `ink3`: the way back is a control, and it sits beside an ink title. */}
          <Glyph color="ink2" accessibilityElementsHidden importantForAccessibility="no">
            {d.chevronPrev}
          </Glyph>
        </Pressable>
        <Text variant="bodyLg" weight="600" className="flex-1" numberOfLines={1}>
          {title}
        </Text>
        {/* 8 px off the bar's edge: the chevron target has its own 12 px of `px-2` on the
            other side, and a pill flush to the frame reads as part of it. */}
        {trailing !== undefined && <View className="px-2">{trailing}</View>}
      </Row>
      {children}
    </View>
  );
}
