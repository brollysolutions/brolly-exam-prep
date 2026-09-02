import { colors } from '@tslprb/design-tokens';
import { TESTS, type TestKind, type TestMeta } from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable } from 'react-native';

import { Chip, cx, Num, Row, Screen, Stack, Text, Toast, useAutoDismiss, usePressed } from '@/ui';

/** Reading order of the three shelves; also the chip order. */
const KINDS: { kind: TestKind; labelKey: string }[] = [
  { kind: 'full', labelKey: 'library.fullMocks' },
  { kind: 'sectional', labelKey: 'library.sectional' },
  { kind: 'previous', labelKey: 'library.previousYear' },
];

const iso = (value: number | string) => `⁦${value}⁩`;

/**
 * One shelf row. A `Pressable` `style` FUNCTION would drop its static `className` entries on
 * web (see `usePressed`), so press feedback is state-driven instead — one `usePressed` call
 * per row, via its own component rather than inside `FlatList`'s `renderItem`.
 */
function LibraryRow({
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
  return (
    <Pressable
      testID={`library-row-${test.id}`}
      accessibilityRole="button"
      accessibilityState={{ disabled: false }}
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={onPress}
      {...handlers}
      className={cx('min-h-[72px] justify-center border-b border-line', first && 'border-t')}
      style={pressed ? { opacity: 0.85 } : undefined}
    >
      <Row gap={3} align="center" justify="between">
        <Stack gap={1} className="flex-1">
          <Text variant="bodyLg" weight="600">
            {test.title[lang]}
          </Text>
          <Row gap={1} align="baseline" wrap>
            <Num variant="caption" weight="600" color="dim">
              {test.pattern.totalQuestions}
            </Num>
            <Text variant="caption" color="dim">
              {t('common.questionsUnit')}
            </Text>
            <Text variant="caption" color="mute" lang="en">
              ·
            </Text>
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
              label={t('library.bestScore', { score: iso(test.attempted.bestScore) })}
              tone="sand"
              active
            />
          )}
          <Chip
            testID={`library-badge-${test.id}`}
            label={test.free ? t('common.free') : t('common.locked')}
            active={test.free}
          />
        </Row>
      </Row>
    </Pressable>
  );
}

export type LibraryViewProps = {
  /** Shelf the screen opens on. */
  initialKind?: TestKind;
  /** A test the candidate may sit. */
  onOpen: (id: string) => void;
  /** A locked test was pressed — no paywall in this phase, just an explanation. */
  onLocked?: (id: string) => void;
};

/**
 * F-08 — the test library. A row says three things and no more: what the paper is, how big
 * it is, and whether it will open. The best score replaces the Free badge once you have one,
 * because after an attempt that is the number you came back for.
 */
export function LibraryView({ initialKind = 'full', onOpen, onLocked }: LibraryViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const lang = d.lang as Lang;
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
            size="md"
            active={k.kind === kind}
            accessibilityRole="radio"
            accessibilityState={{ checked: k.kind === kind }}
            onPress={() => setKind(k.kind)}
          />
        ))}
      </Row>

      <FlatList
        testID="library-list"
        className="mt-2 flex-1"
        contentContainerClassName="pb-6"
        data={rows}
        keyExtractor={(test) => test.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <LibraryRow test={item} lang={lang} first={index === 0} onPress={() => press(item)} />
        )}
      />
    </Screen>
  );
}
