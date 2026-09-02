import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button, Kicker, Stack, Text } from '@/ui';

/** Literal class names so Tailwind's scanner sees every one of them. */
const BLOCK = {
  kicker: 'h-3 w-16',
  score: 'h-14 w-1/2',
  chip: 'h-8 w-1/3',
  row: 'h-8 w-full',
  card: 'h-16 w-full',
} as const;

export type SkeletonBlock = keyof typeof BLOCK;

/**
 * Loading state: static `panel3` blocks in the shape of the content, never a spinner.
 * Nothing animates, so there is nothing for reduced motion to switch off. Hidden from
 * screen readers - an assistive user gets the real content when it arrives.
 */
export function Skeleton({ blocks, testID }: { blocks: SkeletonBlock[]; testID: string }) {
  return (
    <Stack
      gap={3}
      className="px-4 pt-5"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {blocks.map((block, i) => (
        <View key={`${block}-${i}`} className={`${BLOCK[block]} rounded-xs bg-panel3`} />
      ))}
    </Stack>
  );
}

/** Failed load: a flag kicker, the message, and a secondary retry button (48 px). */
export function LoadError({ onRetry, testID }: { onRetry?: () => void; testID: string }) {
  const { t } = useTranslation();
  return (
    <Stack gap={4} className="px-4 pt-6" testID={testID}>
      <Stack gap={2}>
        <Kicker color="flag">{t('result.errorKicker')}</Kicker>
        <Text variant="body" color="dim">
          {t('result.loadError')}
        </Text>
      </Stack>
      <Button
        variant="secondary"
        label={t('result.retry')}
        onPress={onRetry}
        testID={`${testID}-retry`}
      />
    </Stack>
  );
}
