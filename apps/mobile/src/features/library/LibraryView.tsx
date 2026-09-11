import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import { TESTS, type TestKind, type TestMeta } from '@/data/content';
import type { Lang } from '@tslprb/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  Glyph,
  iso,
  MarkerRow,
  Measure,
  LoadError,
  Num,
  PageHeader,
  Pill,
  Row,
  Screen,
  Stack,
  Toast,
  useAutoDismiss,
} from '@/ui';

type LibraryFilter = TestKind | 'si' | 'pc';

/** Reading order of the mock filters and paper shelves. */
const KINDS: { kind: LibraryFilter; labelKey: string }[] = [
  { kind: 'si', labelKey: 'library.siMockTest' },
  { kind: 'pc', labelKey: 'library.constableMockTest' },
  { kind: 'full', labelKey: 'library.fullMocks' },
  { kind: 'previous', labelKey: 'library.previousYear' },
];

/** The lock the badge wears, and the tab bar's own icon set. */
const LOCK = size.icon;

export type LibraryViewProps = {
  lang: Lang;
  /**
   * The shelf's contents. Defaults to the seeded bank; a prop so the gallery and the tests can
   * render the shelf with nothing on it, which no combination of the real fixtures produces.
   */
  tests?: TestMeta[];
  failed?: boolean;
  onRetry?: () => void;
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

/** How big the paper is. Digits, so the row's meta line is a node and not a string. */
function Size({ test }: { test: TestMeta }) {
  const { t } = useTranslation();
  return (
    <Row gap={2} align="baseline" wrap>
      <Measure value={test.pattern.totalQuestions} unit={t('common.questionsUnit')} />
      <Glyph variant="caption" color="ink3">
        ·
      </Glyph>
      <Measure value={test.pattern.durationMinutes} unit={t('common.minutesUnit')} />
    </Row>
  );
}

/**
 * What the row says about itself at its reading end: the best score you have on this paper,
 * and whether it will open. Both quiet pills — a shelf of gold Free badges beside gold filter
 * chips would be several primary actions on one screen, so the gold stays on the active filter.
 *
 * A locked paper wears the lock icon the tab bar and `MarkerRow` already use, not the `⛌`
 * glyph, which no face outside the Latin one carries.
 */
function Badges({ test }: { test: TestMeta }) {
  const { t } = useTranslation();
  const locked = !test.free;
  return (
    <>
      {test.attempted && (
        <Pill
          testID={`library-best-${test.id}`}
          label={t('library.bestScore')}
          leading={
            <Num variant="caption" weight="700" color="ink3">
              {test.attempted.bestScore}
            </Num>
          }
        />
      )}
      <Pill
        testID={`library-badge-${test.id}`}
        label={locked ? t('common.locked') : t('common.free')}
        leading={
          locked ? (
            <Ionicons
              testID={`library-lock-${test.id}`}
              name="lock-closed-outline"
              size={LOCK}
              color={colors.ink3}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          ) : undefined
        }
      />
    </>
  );
}

/** Everything a row is called out loud: a node meta says nothing, so the row spells it out. */
function rowName(test: TestMeta, lang: Lang, t: (key: string) => string): string {
  return [
    test.title[lang],
    `${iso(test.pattern.totalQuestions)} ${t('common.questionsUnit')}`,
    `${iso(test.pattern.durationMinutes)} ${t('common.minutesUnit')}`,
    test.attempted ? `${t('library.bestScore')} ${iso(test.attempted.bestScore)}` : null,
    test.free ? t('common.free') : t('common.locked'),
  ]
    .filter(Boolean)
    .join(' ');
}

/** One shelf row: the whole row is the tap target, and the badges are decoration on it. */
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
  return (
    <MarkerRow
      testID={`library-row-${test.id}`}
      first={first}
      title={test.title[lang]}
      meta={<Size test={test} />}
      trailing={<Badges test={test} />}
      accessibilityLabel={rowName(test, lang, t)}
      onPress={onPress}
    />
  );
}

/**
 * F-22 — a previous-year paper is two different things to two people: something to sit under
 * the clock, and something to read with the answers already on it. One tap target cannot be
 * both, so the row states the paper and then offers the choice underneath.
 *
 * **Practise is the ink fill and View paper is the outline**, by the product owner's ruling on
 * 2026-09-07. Design review A1/D4 had demoted both — one ink primary per screen counts every
 * instance, and a shelf draws this pair once per row, so two black blocks were 14 % of the card
 * at 15.1:1 against an active filter chip at 1.38:1. The owner looked at both and chose the
 * fill: sitting the paper is what the shelf is for, and an outline-against-nothing pair read as
 * two weak choices rather than one strong one.
 *
 * So the "one ink primary per screen" rule now reads "per screen, or once per row in a repeated
 * pair" — see `.claude/rules/mobile-ui.md`. The filter chips keep their gold, which is what the
 * original objection was actually protecting: the shelf must still say which shelf it is.
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
    <View testID={`library-row-${test.id}`}>
      <MarkerRow
        first={first}
        title={test.title[lang]}
        meta={<Size test={test} />}
        trailing={<Badges test={test} />}
      />
      <Row gap={2} className="pb-3">
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
  tests = TESTS,
  failed = false,
  onRetry,
  initialKind,
  kindKey,
  onOpen,
  onViewPaper,
  onLocked,
}: LibraryViewProps) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<LibraryFilter>(initialKind ?? 'full');
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

  const rows = tests.filter(
    (test) =>
      test.listed !== false &&
      (kind === 'si' || kind === 'pc'
        ? test.kind === 'full' && test.pattern.post === kind && !test.fullMocksOnly
        : test.kind === kind),
  );

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
          // `info`: nothing failed and nothing is urgent — the paper is simply not yours yet.
          <Toast testID="library-locked-toast" text={t('library.lockedToast')} tone="info" />
        )
      }
    >
      <PageHeader testID="library-header" title={t('library.title')} />

      <Stack gap={3} className="mt-5 flex-1">
        <Row testID="library-filters" gap={2} wrap accessibilityRole="radiogroup">
          {KINDS.map((k) => (
            <Chip
              key={k.kind}
              testID={`library-filter-${k.kind}`}
              label={t(k.labelKey)}
              shape="pill"
              size="lg"
              active={k.kind === kind}
              accessibilityRole="radio"
              accessibilityState={{ checked: k.kind === kind }}
              onPress={() => setKind(k.kind)}
            />
          ))}
        </Row>

        {/* One shelf, one card: a run of bordered boxes competed with the filters above it.
            The card hugs its rows and the scroller around it takes the height — a `flex-1`
            card left two rows floating at the top of a screen-tall empty box. A shelf is a
            couple of papers, so the list is a scroller, not a `FlatList`. */}
        {failed ? (
          <LoadError testID="library-load-error" onRetry={onRetry} />
        ) : rows.length === 0 ? (
          // A shelf with nothing on it is not a failure, so there is no dot and nothing to
          // retry — the filters above are the way out, and the line says so (design D15).
          <EmptyState testID="library-empty" message={t('library.empty')} />
        ) : (
          <ScrollView
            testID="library-list"
            className="flex-1"
            contentContainerClassName="pb-6"
            showsVerticalScrollIndicator={false}
          >
            <Card>
              {rows.map((test, index) =>
                test.kind === 'previous' ? (
                  <PreviousRow
                    key={test.id}
                    test={test}
                    lang={lang}
                    first={index === 0}
                    onPractise={() => press(test)}
                    onView={() => onViewPaper?.(test.id)}
                  />
                ) : (
                  <TestRow
                    key={test.id}
                    test={test}
                    lang={lang}
                    first={index === 0}
                    onPress={() => press(test)}
                  />
                ),
              )}
            </Card>
          </ScrollView>
        )}
      </Stack>
    </Screen>
  );
}
