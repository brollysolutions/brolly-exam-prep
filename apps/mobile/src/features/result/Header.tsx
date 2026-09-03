import { useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Glyph, Row, Text, usePressed } from '@/ui';

export type BackHeaderProps = {
  title: string;
  onBack?: () => void;
  /**
   * After the title, at the end of the title row (a static "Sample data" chip). The row is a
   * `Row`, so in Urdu it lands at the left edge without a mirrored class of its own.
   */
  trailing?: ReactNode;
  /** Second row inside the header panel (the solutions filter chips). */
  children?: ReactNode;
  testID?: string;
};

/**
 * The result/solutions header: a 48 px chevron-back target and the screen title on the
 * `panel` bar. The chevron is drawn `lang="en"` because Noto Nastaliq Urdu has no
 * U+2039/U+203A and silently falls back to parentheses.
 */
export function BackHeader({ title, onBack, trailing, children, testID }: BackHeaderProps) {
  const d = useDir();
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  return (
    <View className="border-b border-line bg-panel">
      <Row align="center" gap={1} className="px-2 py-1" testID={testID}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={onBack}
          {...handlers}
          className="h-touch w-touch items-center justify-center"
          style={pressed ? { opacity: 0.85 } : undefined}
          testID={testID ? `${testID}-back` : undefined}
        >
          <Glyph color="dim" accessibilityElementsHidden importantForAccessibility="no">
            {d.chevronPrev}
          </Glyph>
        </Pressable>
        <Text variant="bodyLg" weight="600" className="flex-1" numberOfLines={1}>
          {title}
        </Text>
        {/* 8 px off the bar's edge: the chevron target has its own 12 px of `px-2` on the
            other side, and a chip flush to the frame reads as part of it. */}
        {trailing !== undefined && <View className="px-2">{trailing}</View>}
      </Row>
      {children}
    </View>
  );
}
