import { colors } from '@tslprb/design-tokens';
import { TESTS, type TestKind, type TestMeta } from '@tslprb/fixtures';
import type { Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { Chip, cx, Glyph, Num, Row, Screen, Stack, Text, Toast, useAutoDismiss, usePressed } from '@/ui';

/** Reading order of the three shelves; also the chip order. */
const KINDS: { kind: TestKind; labelKey: string }[] = [
  { kind: 'full', labelKey: 'library.fullMocks' },
  { kind: 'sectional', labelKey: 'library.sectional' },
  { kind: 'previous', labelKey: 'library.previousYear' },
];

/**
 * The same locked mark the attempt screen puts on a locked section tab — monochrome, and
 * rendered through `Glyph` so Nastaliq never falls back to tofu.
 */
const LOCK_GLYPH = '⛌';

export type LibraryViewProps = {
  lang: Lang;
  /** Shelf the screen opens on. */
  initialKind?: TestKind;
  /** A test the candidate may sit. */
  onOpen: (id: string) => void;
  /** A locked test was pressed — no paywall in this phase, just an explanation. */
  onLocked?: (id: string) => void;
};

/** One shelf row. Its own component so the press delta can live in state, not a callback. */
function TestRow({
  test,
  lang,
  first,
  onPress,
}: {
  test: TestMeta;
  lang: Lang;
  first: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  const locked = !test.free;
  return (
    <Pressable
      testID={`library-row-${test.id}`}
      accessibilityRole="button"
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={cx('min-h-[72px] justify-center border-b border-line', first && 'border-t')}
      // One flattened object, never a callback: see `usePressed`.
      style={StyleSheet.flatten([pressed ? { opacity: 0.85 } : null])}
    >
      <Row gap={3} align="center" justify="between">
        <Stack gap={1} className="flex-1">
          {/* A locked paper is present but not available, so its title recedes rather than
              shouting the same as one you can sit. */}
          <Text variant="bodyLg" weight="600" color={locked ? 'dim' : 'chalk'}>
            {test.title[lang]}
          </Text>
          <Row gap={1} align="baseline" wrap>
            <Num variant="caption" weight="600" color="dim">
              {test.pattern.totalQuestions}
            </Num>
            <Text variant="caption" color="dim">
              {t('common.questionsUnit')}
            </Text>
            <Glyph variant="caption" color="mute">
              ·
            </Glyph>
            <Num variant="caption" weight="600" color="dim">
              {test.pattern.durationMinutes}
            </Num>
            <Text variant="caption" color="dim">
              {t('common.minutesUnit')}
            </Text>
          </Row>
        </Stack>
        <Row gap={2} align="center">
          {test.attempted && (
            <Chip
              testID={`library-best-${test.id}`}
              label={t('library.bestScore')}
              leading={
                <Num variant="small" weight="700" color="dim">
                  {test.attempted.bestScore}
                </Num>
              }
            />
          )}
          {/* Only the active filter wears hi-vis; a shelf of solid-yellow Free badges would
              have three primary actions per row (design review round 1). */}
          <Chip
            testID={`library-badge-${test.id}`}
            label={locked ? t('common.locked') : t('common.free')}
            muted={locked}
            leading={
              locked ? (
                <Glyph variant="small" color="mute">
                  {LOCK_GLYPH}
                </Glyph>
              ) : undefined
            }
          />
        </Row>
      </Row>
    </Pressable>
  );
}

/**
 * F-08 — the test library. A row says three things and no more: what the paper is, how big
 * it is, and whether it will open. The best score replaces nothing and adds itself once you
 * have one, because after an attempt that is the number you came back for.
 */
export function LibraryView({ lang, initialKind = 'full', onOpen, onLocked }: LibraryViewProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<TestKind>(initialKind);
  // A tick, not a timestamp: `Date.now()` in a handler trips the React Compiler purity rule,
  // and `useAutoDismiss` only needs the value to *change* to restart its clock.
  const [lockedTick, setLockedTick] = useState(0);
  const locked = useAutoDismiss(lockedTick || null);

  const rows = TESTS.filter((test) => test.kind === kind);

  const press = (test: TestMeta) => {
    if (test.free) {
      onOpen(test.id);
      return;
    }
    setLockedTick((n) => n + 1);
    onLocked?.(test.id);
  };

  return (
    <Screen
      padded
      bottomInset={false}
      testID="library-screen"
      overlay={
        locked === undefined ? undefined : (
          <Toast testID="library-locked-toast" text={t('library.lockedToast')} tone="hazard" />
        )
      }
    >
      <Text variant="titleLg" weight="600" className="mt-5">
        {t('library.title')}
      </Text>

      <Row testID="library-filters" gap={2} wrap className="mt-4" accessibilityRole="radiogroup">
        {KINDS.map((k) => (
          <Chip
            key={k.kind}
            testID={`library-filter-${k.kind}`}
            label={t(k.labelKey)}
            size="lg"
            active={k.kind === kind}
            accessibilityRole="radio"
            accessibilityState={{ checked: k.kind === kind }}
            onPress={() => setKind(k.kind)}
          />
        ))}
      </Row>

      <FlatList
        testID="library-list"
        className="mt-4 flex-1"
        contentContainerClassName="pb-6"
        data={rows}
        keyExtractor={(test) => test.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <TestRow test={item} lang={lang} first={index === 0} onPress={() => press(item)} />
        )}
      />
    </Screen>
  );
}
