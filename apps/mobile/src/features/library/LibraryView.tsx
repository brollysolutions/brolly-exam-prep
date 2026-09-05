import { colors } from '@tslprb/design-tokens';
import { TESTS, type TestKind, type TestMeta } from '@tslprb/fixtures';
import type { Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Chip,
  cx,
  Glyph,
  Measure,
  Num,
  Row,
  Screen,
  Stack,
  Text,
  Toast,
  useAutoDismiss,
  usePressed,
} from '@/ui';

/** Reading order of the three shelves; also the chip order. */
const KINDS: { kind: TestKind; labelKey: string }[] = [
  { kind: 'full', labelKey: 'library.fullMocks' },
  { kind: 'sectional', labelKey: 'library.sectional' },
  { kind: 'previous', labelKey: 'library.previousYear' },
];

/**
 * The same locked mark the attempt screen puts on a locked section tab — monochrome, and
 * rendered through `Glyph` so it never falls back to tofu in another face.
 */
const LOCK_GLYPH = '⛌';

export type LibraryViewProps = {
  lang: Lang;
  /**
   * Shelf the screen opens on, from `?kind=`. The Tests tab is already mounted when Home
   * links to it, so a later request moves the shelf too — see the sync below.
   */
  initialKind?: TestKind;
  /**
   * Identity of the *navigation* that asked for `initialKind`, not of the value: two presses
   * of Home's Previous-papers card send `previous` both times, and a shelf that compared
   * values would ignore the second. The route bumps a visit counter on focus and passes
   * `` `${kind}:${visit}` ``, so every arrival is its own key.
   */
  kindKey?: string;
  /** A test the candidate may sit. */
  onOpen: (id: string) => void;
  /** A previous-year paper to read rather than sit. Ungated: no account, no attempt. */
  onViewPaper?: (id: string) => void;
  /** A locked test was pressed — no paywall in this phase, just an explanation. */
  onLocked?: (id: string) => void;
};

/**
 * What every shelf says about a paper and no more: what it is, how big it is, and whether it
 * will open. Shared by the pressable rows and the previous-year row, which carries its own
 * buttons underneath instead.
 */
function RowHead({ test, lang }: { test: TestMeta; lang: Lang }) {
  const { t } = useTranslation();
  const locked = !test.free;
  return (
    <Row gap={3} align="center" justify="between">
      <Stack gap={1} className="flex-1">
        {/* A locked paper is present but not available, so its title recedes rather than
            shouting the same as one you can sit. */}
        <Text variant="bodyLg" weight="600" color={locked ? 'dim' : 'chalk'}>
          {test.title[lang]}
        </Text>
        <Row gap={2} align="baseline" wrap>
          <Measure value={test.pattern.totalQuestions} unit={t('common.questionsUnit')} />
          <Glyph variant="caption" color="mute">
            ·
          </Glyph>
          <Measure value={test.pattern.durationMinutes} unit={t('common.minutesUnit')} />
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
  );
}

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
  const { pressed, handlers } = usePressed();
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
      <RowHead test={test} lang={lang} />
    </Pressable>
  );
}

/**
 * F-22 — a previous-year paper is two different things to two people: something to sit under
 * the clock, and something to read with the answers already on it. One tap target cannot be
 * both, so the row states the paper and then offers the choice underneath.
 *
 * Practise is the row's one hi-vis action and View paper stays `secondary`: a pair of
 * identical outlines made the reader work out which was the main move, and weight alone was
 * too quiet to say it. The filter chips overhead are navigation, not actions on this paper.
 */
function PreviousRow({
  test,
  lang,
  first,
  onPractise,
  onView,
}: {
  test: TestMeta;
  lang: Lang;
  first: boolean;
  onPractise: () => void;
  onView: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      testID={`library-row-${test.id}`}
      className={cx('justify-center border-b border-line py-3', first && 'border-t')}
    >
      <RowHead test={test} lang={lang} />
      <Row gap={2} className="mt-3">
        <Button
          variant="primary"
          size="md"
          weight="700"
          label={t('library.practise')}
          onPress={onPractise}
          className="flex-1"
          testID={`library-practise-${test.id}`}
        />
        <Button
          variant="secondary"
          size="md"
          label={t('library.viewPaper')}
          onPress={onView}
          className="flex-1"
          testID={`library-view-${test.id}`}
        />
      </Row>
    </View>
  );
}

/**
 * F-08 — the test library. A row says three things and no more: what the paper is, how big
 * it is, and whether it will open. The best score replaces nothing and adds itself once you
 * have one, because after an attempt that is the number you came back for.
 */
export function LibraryView({
  lang,
  initialKind,
  kindKey,
  onOpen,
  onViewPaper,
  onLocked,
}: LibraryViewProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<TestKind>(initialKind ?? 'full');
  // The Tests tab is mounted long before Home links to `?kind=previous`, so the request has to
  // be watched, not just read once — and watched by *navigation*, not by value, or a repeat of
  // the same link would be a no-op. React's own "adjust state when a prop changes" shape rather
  // than an effect: the list never paints the stale shelf for a frame, and a chip the candidate
  // presses afterwards still wins until the next navigation arrives.
  const [requested, setRequested] = useState(kindKey);
  if (kindKey !== requested) {
    setRequested(kindKey);
    if (initialKind) setKind(initialKind);
  }
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
        renderItem={({ item, index }) =>
          item.kind === 'previous' ? (
            <PreviousRow
              test={item}
              lang={lang}
              first={index === 0}
              onPractise={() => press(item)}
              onView={() => onViewPaper?.(item.id)}
            />
          ) : (
            <TestRow test={item} lang={lang} first={index === 0} onPress={() => press(item)} />
          )
        }
      />
    </Screen>
  );
}
