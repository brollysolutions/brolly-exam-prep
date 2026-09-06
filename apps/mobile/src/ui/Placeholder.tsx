import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from './Button';
import { cx } from './cx';
import { Pill, type PillDotTone } from './Pill';
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
export function Skeleton({
  blocks,
  className,
  testID,
}: {
  blocks: SkeletonBlock[];
  className?: string;
  testID?: string;
}) {
  return (
    <Stack
      gap={3}
      className={cx('px-4 pt-5', className)}
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
  /**
   * A status dot on the pill. Left off there is none — an empty shelf is not a state, it is a
   * shelf with nothing on it. `danger` is for the empty state that IS a failure of a sort: an
   * id nothing answers to, which `LoadError` already marks the same way, so the two not-found
   * screens read as one mechanism rather than two (design review D14).
   */
  dotTone?: PillDotTone;
  className?: string;
  testID?: string;
};

/**
 * Nothing here yet: a quiet pill over one `ink3` line, centred in the space the content would
 * have filled. Distinct from `LoadError` — nothing failed, so there is nothing to retry, and a
 * grey line in the top corner reads as a screen that never loaded (design 13, F-24).
 */
export function EmptyState({
  title,
  message,
  action,
  dotTone,
  className,
  testID,
}: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <Stack
      gap={3}
      className={cx('flex-1 items-center justify-center px-8', className)}
      testID={testID}
    >
      <Pill
        align="center"
        label={title ?? t('common.nothingYet')}
        testID={testID ? `${testID}-pill` : undefined}
        dot={dotTone !== undefined && dotTone !== 'none'}
        dotTone={dotTone}
      />
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
  className?: string;
  testID?: string;
};

/**
 * The load failed: a pill with a red dot, the message, and a 48 px outline retry.
 *
 * The same 24 px `Pill` and the same centring as `EmptyState`: the two are one family, and a
 * 34 px `Chip` beside a 24 px pill made them look like different mechanisms (design review D7).
 * Red is a verdict, so it lives in the dot rather than in the fill — `dangerInk` at 5.4:1 on
 * the pill's own `surface2`.
 */
export function LoadError({ message, onRetry, className, testID }: LoadErrorProps) {
  const { t } = useTranslation();
  return (
    <Stack
      gap={3}
      className={cx('flex-1 items-center justify-center px-8', className)}
      testID={testID}
    >
      <Pill align="center" label={t('result.errorKicker')} dot dotTone="danger" />
      <Text variant="body" color="ink3" align="center">
        {message ?? t('result.loadError')}
      </Text>
      <Button
        variant="secondary"
        label={t('result.retry')}
        onPress={onRetry}
        testID={testID ? `${testID}-retry` : undefined}
        className="px-6"
      />
    </Stack>
  );
}
