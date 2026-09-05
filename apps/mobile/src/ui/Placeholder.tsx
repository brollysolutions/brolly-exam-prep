import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from './Button';
import { Chip } from './Chip';
import { Pill } from './Pill';
import { Stack } from './Stack';
import { Text } from './Text';

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
 * Loading: static `surface2` blocks in the shape of the content, never a spinner. Nothing
 * animates, so there is nothing for reduced motion to switch off. Hidden from screen readers —
 * an assistive user gets the real content when it arrives.
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
        <View key={`${block}-${i}`} className={`${BLOCK[block]} rounded-xs bg-surface2`} />
      ))}
    </Stack>
  );
}

export type EmptyStateProps = {
  /** The pill over the line; defaults to the shared "Nothing yet". */
  title?: string;
  /** One line saying what will appear here. */
  message: string;
  /** An optional way on — an outline button, never a second fill. */
  action?: ReactNode;
  testID: string;
};

/**
 * Nothing here yet: a quiet pill over one `ink3` line, centred in the space the content would
 * have filled. Distinct from `LoadError` — nothing failed, so there is nothing to retry, and a
 * grey line in the top corner reads as a screen that never loaded (design 13, F-24).
 */
export function EmptyState({ title, message, action, testID }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={3} className="flex-1 items-center justify-center px-8" testID={testID}>
      <Pill align="center" label={title ?? t('common.nothingYet')} />
      <Text variant="body" color="ink3" align="center">
        {message}
      </Text>
      {action}
    </Stack>
  );
}

export type LoadErrorProps = {
  /**
   * What could not be loaded, when the screen knows ("that paper could not be opened"); left
   * off, it falls back to the generic line every other screen shares.
   */
  message?: string;
  onRetry?: () => void;
  testID: string;
};

/**
 * The load failed: a red pill, the message, and a 48 px outline retry. Red because a failure is
 * in the same family as wrong and missing; the pill is a `Chip tone="danger"` rather than a
 * `Pill`, which has no red — red is a verdict, and `Pill` carries states.
 */
export function LoadError({ message, onRetry, testID }: LoadErrorProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={3} className="items-center px-8 pt-8" testID={testID}>
      <Chip label={t('result.errorKicker')} tone="danger" active shape="pill" />
      <Text variant="body" color="ink3" align="center">
        {message ?? t('result.loadError')}
      </Text>
      <Button
        variant="secondary"
        label={t('result.retry')}
        onPress={onRetry}
        testID={`${testID}-retry`}
        className="px-6"
      />
    </Stack>
  );
}
