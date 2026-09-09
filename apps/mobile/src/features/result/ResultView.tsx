import { text as textSizes } from '@tslprb/design-tokens';
import { COST_ROWS } from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView } from 'react-native';

import type { ResultAction, ResultDetail } from '@/data/api';
import {
  ActionBar,
  BackHeader,
  Button,
  Card,
  Chip,
  Duration,
  formatDuration,
  formatRank,
  Glyph,
  isLatinValue,
  LoadError,
  Num,
  Pill,
  Row,
  Screen,
  Skeleton,
  Stack,
  Text,
  useDurationUnits,
} from '@/ui';

import { DemoNotice } from '@/ui/DemoNotice';

export type ResultViewProps = {
  demo?: boolean;
  /** Omit while the analysis is loading; the skeleton shows instead. */
  result?: ResultDetail;
  /** The load failed: the retry state replaces the body. */
  failed?: boolean;
  /** Imported practice papers review every question, without sample analytics. */
  reviewAll?: boolean;
  onBack?: () => void;
  onRetry?: () => void;
  onSeeWrong?: () => void;
  onAction?: (action: ResultAction) => void;
};

/** The shape of the loaded screen: kicker, score, chip row, six stat rows, three cards. */
const SKELETON = [
  'kicker',
  'score',
  'chip',
  'row',
  'row',
  'row',
  'row',
  'row',
  'row',
  'card',
  'card',
  'card',
] as const;

/**
 * Rows inside a card carry the hairline on TOP, so the last one never draws a line against the
 * card's own border — the `MarkerRow` rule, and the reason the first row asks for `first`.
 */
const rowDivider = (first: boolean) => (first ? 'py-3' : 'border-t border-line py-3');

/** The tabular figure at the end of a "where you stand" row. */
const StandValue = ({ children }: { children: string }) => (
  <Num variant="bodyLg" className="shrink-0" numberOfLines={1}>
    {children}
  </Num>
);

/**
 * One "where you stand" row: label on the start side, tabular value on the end side. The
 * value is a node because a duration is not one string - its digits and its localised unit
 * render in different faces - so `valueText` carries the spoken form.
 */
function StandRow({
  label,
  value,
  valueText,
  first = false,
}: {
  label: string;
  value: ReactNode;
  valueText: string;
  first?: boolean;
}) {
  return (
    <Row
      gap={3}
      align="baseline"
      className={rowDivider(first)}
      testID="result-stand-row"
      accessible
      accessibilityLabel={`${label} ${valueText}`}
    >
      <Text variant="body" color="ink2" className="flex-1">
        {label}
      </Text>
      {value}
    </Row>
  );
}

/**
 * One "what cost you marks" row. The fixture's Telugu values carry their unit in
 * their own script ("92 sec"), which Inter cannot draw - only a Latin value may go into
 * `<Num>`; the rest stays in the language face and is merely tabular.
 *
 * The value is `accentInk` (4.77:1 on the card's `surface`) — the one gold that is text, and
 * these figures are the candidate's own: the minutes they spent, the marks they gave away.
 *
 * `align="baseline"` sits the value on the label's first line rather than the top of the
 * box: a Telugu value is a whole word tall and floated above the label without it. It never
 * shrinks or wraps, so the two-line label keeps the width it needs.
 */
function CostRow({
  label,
  note,
  value,
  first = false,
}: {
  label: string;
  note: string;
  value: string;
  first?: boolean;
}) {
  return (
    <Row gap={3} align="baseline" className={rowDivider(first)} testID="result-cost-row">
      <Stack gap={1} className="flex-1">
        <Text variant="body">{label}</Text>
        <Text variant="caption" color="ink3">
          {note}
        </Text>
      </Stack>
      {isLatinValue(value) ? (
        <Num variant="question" color="accentInk" className="shrink-0" numberOfLines={1}>
          {value}
        </Num>
      ) : (
        <Text
          variant="question"
          weight="700"
          color="accentInk"
          numeric
          className="shrink-0"
          numberOfLines={1}
        >
          {value}
        </Text>
      )}
    </Row>
  );
}

/**
 * A "do this next" drill card: P2 with the chevron in its `trailing` slot. It carries no gold
 * start edge — the score above it is the screen's one edged card, and three edges in a column
 * would point at none of them (the Updates ruling, F-30).
 */
function ActionCard({ action, onPress }: { action: ResultAction; onPress?: () => void }) {
  const d = useDir();
  return (
    <Card
      size="md"
      title={action.title[d.lang]}
      subtitle={action.sub[d.lang]}
      onPress={onPress}
      trailing={
        <Glyph color="ink3" accessibilityElementsHidden importantForAccessibility="no">
          {d.chevronNext}
        </Glyph>
      }
      testID="result-action"
    />
  );
}

/** A numbered section head: the pill every block on every screen opens with. */
function SectionPill({ index, label }: { index: string; label: string }) {
  return (
    <Pill
      // `ink3` on the pill's `surface2` is 4.66:1; `accentInk` there would be 4.25, and a
      // printed index is not the candidate's own input in any case (ruling F-30 fix wave, A2).
      leading={
        <Num variant="caption" weight="700" color="ink3" tracking="none">
          {index}
        </Num>
      }
      label={label}
    />
  );
}

/**
 * Result & analysis (F-12), pure: every state is a prop, so the dev gallery and the tests
 * render the same component the route does.
 */
export function ResultView({
  demo = false,
  result,
  failed = false,
  reviewAll = false,
  onBack,
  onRetry,
  onSeeWrong,
  onAction,
}: ResultViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const units = useDurationUnits();
  const costRows = COST_ROWS[d.lang];

  /**
   * "Where you stand", in the prototype's order — but the rank line only when there IS a
   * rank. A rank is a fact about every other candidate, so a paper marked on the handset
   * has none, and the API returns `rank: null` for a fresh result too. The line is dropped
   * rather than filled: printing the sample fixture's "1,284 / 9,033" under a real
   * candidate's score is exactly the defect F-34 removed.
   */
  const standRows: { label: string; value: ReactNode; valueText: string }[] = [];
  if (result) {
    if (result.rank !== undefined && result.totalCandidates !== undefined) {
      const rankText = formatRank(result.rank, result.totalCandidates);
      standRows.push({
        label: t('result.rank'),
        value: <StandValue>{rankText}</StandValue>,
        valueText: rankText,
      });
    }
    const accuracyText = `${result.accuracyPct}%`;
    standRows.push({
      label: t('result.accuracy'),
      value: <StandValue>{accuracyText}</StandValue>,
      valueText: accuracyText,
    });
    standRows.push({
      label: t('result.perQ'),
      value: (
        <Duration
          seconds={result.avgSecondsPerQuestion}
          variant="bodyLg"
          weight="700"
          className="shrink-0"
        />
      ),
      valueText: formatDuration(result.avgSecondsPerQuestion, units),
    });
  }

  return (
    /* `ActionBar` owns the bottom inset, the way a tab scene's bar does. */
    <Screen bottomInset={false} testID="result-screen">
      <BackHeader
        title={result?.title?.[d.lang] ?? t('result.title', { n: result?.testTitleN ?? '' }).trim()}
        onBack={onBack}
        testID="result-header"
      />

      {failed ? (
        <LoadError onRetry={onRetry} testID="result-error" />
      ) : !result ? (
        <Skeleton blocks={[...SKELETON]} testID="result-skeleton" />
      ) : (
        <>
          {/* The indicator stays: this screen runs several viewports long. */}
          <ScrollView className="flex-1" contentContainerClassName="px-4 pb-6 pt-5">
            {/* The screen's one gold-edged card. `accentStrong` (3.48:1 on the card), not the
                brand `accent`, which is 2.42 there. */}
            <Card startEdge="accentStrong" testID="result-score-card">
              {demo && <DemoNotice />}
              <Pill label={t('result.yourScore')} />
              {/* Physical: a score always reads "62.25 / 100", never mirrored. */}
              <Row physical align="baseline" gap={2} className="mt-2" testID="result-score-row">
                {/* Ink, never gold: 58 px of `accent` on cream is 2.42:1. */}
                <Num
                  variant="score"
                  tracking="scoreTight"
                  style={{ lineHeight: textSizes.score }}
                  testID="result-score"
                >
                  {result.score}
                </Num>
                <Num variant="glyph" weight="600" color="ink3">
                  {`/ ${result.maxScore}`}
                </Num>
              </Row>

              {!reviewAll && (
                <Row gap={2} wrap align="center" className="mt-3">
                  {/* A verdict is a `Chip`: gold when it passed, the red tint under a red
                    outline when it did not (`dangerInk` on that tint is 5.27:1). */}
                  <Chip
                    label={result.qualified ? t('result.qualified') : t('result.notQualified')}
                    tone={result.qualified ? 'accent' : 'danger'}
                    shape="pill"
                    size="md"
                    active
                    testID="result-qualified"
                  />
                  <Row gap={1} align="baseline">
                    <Text variant="small" color="ink3">
                      {t('result.cutoff')}
                    </Text>
                    <Num variant="small" weight="600" color="ink3">
                      {`${result.cutoffPct}%`}
                    </Num>
                  </Row>
                </Row>
              )}
            </Card>

            <Stack gap={2} className="mt-7">
              <SectionPill index="01" label={t('result.r1')} />
              <Card>
                {standRows.map((row, i) => (
                  <StandRow key={row.label} {...row} first={i === 0} />
                ))}
              </Card>
            </Stack>

            <Stack gap={2} className="mt-7">
              <SectionPill index="02" label={t('result.r2')} />
              <Card>
                {reviewAll
                  ? [
                      [t('result.right'), result.correct],
                      [t('result.wrong'), result.wrong],
                      [t('result.skipped'), result.skipped],
                    ].map(([label, value], i) => (
                      <StandRow
                        key={label}
                        label={String(label)}
                        value={<StandValue>{String(value ?? 0)}</StandValue>}
                        valueText={String(value ?? 0)}
                        first={i === 0}
                      />
                    ))
                  : costRows.map(([label, value, note], i) => (
                      <CostRow
                        key={label}
                        label={label}
                        value={value}
                        note={note}
                        first={i === 0}
                      />
                    ))}
              </Card>
            </Stack>

            {(!reviewAll || result.actions.length > 0) && (
              <Stack gap={2} className="mt-7">
                <SectionPill index="03" label={t('result.r3')} />
                <Stack gap={2}>
                  {result.actions.map((action) => (
                    <ActionCard
                      key={action.id}
                      action={action}
                      onPress={() => onAction?.(action)}
                    />
                  ))}
                </Stack>
              </Stack>
            )}
          </ScrollView>

          <ActionBar
            testID="result-actions"
            primary={
              <Button
                size="lg"
                label={t(reviewAll ? 'solutions.title' : 'result.seeWrong')}
                onPress={onSeeWrong}
                testID="result-cta"
              />
            }
          />
        </>
      )}
    </Screen>
  );
}
