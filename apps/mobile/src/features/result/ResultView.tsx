import { colors, radius, text as textSizes } from '@tslprb/design-tokens';
import { COST_ROWS } from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import type { ResultAction, ResultDetail } from '@/data/api';
import {
  Button,
  Chip,
  Duration,
  formatDuration,
  formatRank,
  Glyph,
  isLatinValue,
  Kicker,
  Num,
  Row,
  Screen,
  Stack,
  Text,
  useDurationUnits,
  usePressed,
} from '@/ui';

import { startEdge } from './edge';
import { BackHeader } from './Header';
import { LoadError, Skeleton } from './Placeholder';

export type ResultViewProps = {
  /** Omit while the analysis is loading; the skeleton shows instead. */
  result?: ResultDetail;
  /** The load failed: the retry state replaces the body. */
  failed?: boolean;
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
 * Rows are separated, not boxed: the last row of a list drops its rule so the block ends on
 * the section gap instead of a line that divides nothing.
 */
const rowDivider = (last: boolean) => (last ? 'py-3' : 'border-b border-panel3 py-3');

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
  last = false,
}: {
  label: string;
  value: ReactNode;
  valueText: string;
  last?: boolean;
}) {
  return (
    <Row
      gap={3}
      align="baseline"
      className={rowDivider(last)}
      testID="result-stand-row"
      accessible
      accessibilityLabel={`${label} ${valueText}`}
    >
      <Text variant="body" color="chalk2" className="flex-1">
        {label}
      </Text>
      {value}
    </Row>
  );
}

/**
 * One "what cost you marks" row. The fixture's Telugu values carry their unit in
 * their own script ("92 sec"), which Archivo cannot draw - only a Latin value may go into
 * `<Num>`; the rest stays in the language face and is merely tabular.
 *
 * `align="baseline"` sits the value on the label's first line rather than the top of the
 * box: a Telugu value is a whole word tall and floated above the label without it. It never
 * shrinks or wraps, so the two-line label keeps the width it needs.
 */
function CostRow({
  label,
  note,
  value,
  last = false,
}: {
  label: string;
  note: string;
  value: string;
  last?: boolean;
}) {
  return (
    <Row gap={3} align="baseline" className={rowDivider(last)} testID="result-cost-row">
      <Stack gap={1} className="flex-1">
        <Text variant="body">{label}</Text>
        <Text variant="caption" color="dim">
          {note}
        </Text>
      </Stack>
      {isLatinValue(value) ? (
        <Num variant="question" color="hazard" className="shrink-0" numberOfLines={1}>
          {value}
        </Num>
      ) : (
        <Text
          variant="question"
          weight="700"
          color="hazard"
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
 * A "do this next" drill card. Built from a `Pressable` rather than `Card` so the mirrored
 * 3 px edge can live in a flattened style object: a `className` that changes with the
 * language would accumulate on web, and a `Pressable` style *function* would drop those
 * static values on web (see `usePressed`) — press feedback is driven from state instead.
 */
function ActionCard({ action, onPress }: { action: ResultAction; onPress?: () => void }) {
  const d = useDir();
  const { pressed, handlers } = usePressed();
  return (
    <View
      style={{
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.panel2,
        overflow: 'hidden',
        ...startEdge(d.isRTL, 'hivis'),
      }}
    >
      <Pressable
        accessibilityRole="button"
        android_ripple={{ color: colors.hivisTint3 }}
        onPress={onPress}
        {...handlers}
        className="min-h-16 justify-center p-4"
        style={pressed ? { opacity: 0.85 } : undefined}
        testID="result-action"
      >
        <Row gap={3} align="center">
          <Stack gap={1} className="flex-1">
            <Text variant="body" weight="600">
              {action.title[d.lang]}
            </Text>
            <Text variant="caption" color="dim">
              {action.sub[d.lang]}
            </Text>
          </Stack>
          <Glyph color="hivis" accessibilityElementsHidden importantForAccessibility="no">
            {d.chevronNext}
          </Glyph>
        </Row>
      </Pressable>
    </View>
  );
}

/**
 * Result & analysis (F-12), pure: every state is a prop, so the dev gallery and the tests
 * render the same component the route does.
 */
export function ResultView({
  result,
  failed = false,
  onBack,
  onRetry,
  onSeeWrong,
  onAction,
}: ResultViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const units = useDurationUnits();
  const costRows = COST_ROWS[d.lang];
  const rankText = result ? formatRank(result.rank, result.totalCandidates) : '';
  const accuracyText = result ? `${result.accuracyPct}%` : '';

  return (
    <Screen testID="result-screen">
      <BackHeader
        title={t('result.title', { n: result?.testTitleN ?? '' }).trim()}
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
            <Kicker>{t('result.yourScore')}</Kicker>
            {/* Physical: a score always reads "62.25 / 100", never mirrored. */}
            <Row physical align="baseline" gap={2} className="mt-1" testID="result-score-row">
              <Num
                variant="score"
                color="hivis"
                tracking="scoreTight"
                style={{ lineHeight: textSizes.score }}
                testID="result-score"
              >
                {result.score}
              </Num>
              <Num variant="glyph" weight="600" color="ghost">
                {`/ ${result.maxScore}`}
              </Num>
            </Row>

            <Row gap={2} wrap align="center" className="mt-3">
              <Chip
                label={result.qualified ? t('result.qualified') : t('result.notQualified')}
                tone={result.qualified ? 'hivis' : 'flag'}
                active
                testID="result-qualified"
              />
              <Row gap={1} align="baseline">
                <Text variant="small" color="dim">
                  {t('result.cutoff')}
                </Text>
                <Num variant="small" weight="600" color="dim">
                  {`${result.cutoffPct}%`}
                </Num>
              </Row>
            </Row>

            <View className="mt-6 h-px bg-line2" />

            <Stack gap={2} className="mt-4">
              <Kicker index="01">{t('result.r1')}</Kicker>
              <View>
                <StandRow
                  label={t('result.rank')}
                  value={<StandValue>{rankText}</StandValue>}
                  valueText={rankText}
                />
                <StandRow
                  label={t('result.accuracy')}
                  value={<StandValue>{accuracyText}</StandValue>}
                  valueText={accuracyText}
                />
                <StandRow
                  label={t('result.perQ')}
                  value={
                    <Duration
                      seconds={result.avgSecondsPerQuestion}
                      variant="bodyLg"
                      weight="700"
                      color="chalk"
                      className="shrink-0"
                    />
                  }
                  valueText={formatDuration(result.avgSecondsPerQuestion, units)}
                  last
                />
              </View>
            </Stack>

            <Stack gap={2} className="mt-6">
              <Kicker index="02">{t('result.r2')}</Kicker>
              <View>
                {costRows.map(([label, value, note], i) => (
                  <CostRow
                    key={label}
                    label={label}
                    value={value}
                    note={note}
                    last={i === costRows.length - 1}
                  />
                ))}
              </View>
            </Stack>

            <Stack gap={2} className="mt-6">
              <Kicker index="03" indexColor="hivis" color="hivis">
                {t('result.r3')}
              </Kicker>
              <Stack gap={2}>
                {result.actions.map((action) => (
                  <ActionCard key={action.id} action={action} onPress={() => onAction?.(action)} />
                ))}
              </Stack>
            </Stack>
          </ScrollView>

          <View className="border-t border-line bg-panel px-3 pb-3 pt-2">
            <Button
              size="lg"
              label={t('result.seeWrong')}
              onPress={onSeeWrong}
              testID="result-cta"
            />
          </View>
        </>
      )}
    </Screen>
  );
}
