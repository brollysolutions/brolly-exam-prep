import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import { Chip, Duration, Glyph, Kicker, Num, Row, Screen, Stack, Text } from '@/ui';

import { startEdge } from './edge';
import { BackHeader } from './Header';
import { LoadError, Skeleton } from './Placeholder';
import { filterSolutionRows, type SolutionFilter, type SolutionRow } from './solutions';

export type SolutionsViewProps = {
  /** Omit while the paper and review are loading; the skeleton shows instead. */
  rows?: SolutionRow[];
  /** The load failed: the retry state replaces the body. */
  failed?: boolean;
  /** Which chip starts active. The chips are self-managed from there. */
  initialFilter?: SolutionFilter;
  onBack?: () => void;
  onRetry?: () => void;
};

const SKELETON = ['chip', 'card', 'card', 'card'] as const;

/** ✓ / ✕ in the Latin face — Noto Nastaliq Urdu has neither glyph. */
function Badge({ correct }: { correct: boolean }) {
  return (
    <View
      className={
        correct
          ? 'h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-hivis'
          : 'h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-flag'
      }
    >
      <Glyph
        variant="small"
        weight="700"
        color={correct ? 'tar' : 'white'}
        align="center"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {correct ? '✓' : '✕'}
      </Glyph>
    </View>
  );
}

/**
 * The tinted answer blocks: a 3 px start bar over a matching tint.
 *
 * The "your answer" kicker is `chalk`, not `flag`: flag on `flagTint` over tar is 4.29:1,
 * under AA for 11 px text. The 3 px bar and the tint already say "this one was wrong", so
 * the label does not have to. Hi-vis on `hivisTint2` is 13.9:1 and stays.
 */
function AnswerBlock({
  tone,
  label,
  text,
  className,
  testID,
}: {
  tone: 'flag' | 'hivis';
  label: string;
  text: string;
  className: string;
  testID: string;
}) {
  const d = useDir();
  return (
    <View
      testID={testID}
      className={className}
      style={{
        backgroundColor: tone === 'flag' ? colors.flagTint : colors.hivisTint2,
        ...startEdge(d.isRTL, tone),
      }}
    >
      <Kicker color={tone === 'flag' ? 'chalk' : 'hivis'} tracking="kickerTight">
        {label}
      </Kicker>
      <Text variant="body" className="mt-1" testID={`${testID}-text`}>
        {text}
      </Text>
    </View>
  );
}

function SolutionCard({ row }: { row: SolutionRow }) {
  const { t } = useTranslation();
  const d = useDir();
  const optionKeys = t('test.optionKeys', { returnObjects: true }) as unknown as string[];
  const options = row.question.options[d.lang];
  const label = (index: number) => `${optionKeys[index] ?? ''} · ${options[index] ?? ''}`;

  return (
    <View className="rounded-md border border-line bg-panel2 p-4" testID="solution-card">
      <Row gap={2} align="center">
        <Badge correct={row.isCorrect} />
        <Row gap={1} align="baseline">
          <Kicker tracking="kickerTight">{t('test.qLabel')}</Kicker>
          <Num variant="kicker" color="dim" tracking="none">
            {row.questionNo}
          </Num>
        </Row>
      </Row>

      <Text variant="bodyLg" className="mt-3">
        {row.question.text[d.lang]}
      </Text>

      {!row.isCorrect && row.your !== null && (
        <AnswerBlock
          tone="flag"
          label={t('solutions.yourAnswer')}
          text={label(row.your)}
          className="mt-3 px-3 py-2"
          testID="solution-your-answer"
        />
      )}

      <AnswerBlock
        tone="hivis"
        label={t('solutions.correctAnswer')}
        text={label(row.correct)}
        className="mt-2 px-3 py-2"
        testID="solution-correct-answer"
      />

      <View className="mt-3 border-t border-panel3 pt-3">
        <Kicker color="sand" tracking="kicker">
          {t('solutions.why')}
        </Kicker>
        <Text variant="body" color="chalk2" className="mt-2">
          {row.question.explanation[d.lang]}
        </Text>
      </View>

      <Row gap={1} wrap align="baseline" className="mt-3">
        <Text variant="caption" color="dim">
          {t('solutions.yourTime')}
        </Text>
        <Duration seconds={row.seconds} testID="solution-your-time" />
        <Glyph variant="caption" color="dim">
          ·
        </Glyph>
        <Text variant="caption" color="dim">
          {t('solutions.avgTime')}
        </Text>
        <Duration seconds={row.question.avgSeconds} testID="solution-avg-time" />
      </Row>
    </View>
  );
}

/** A 14 px gutter between cards. Hoisted: a `FlatList` slot must be a component, not an element. */
const Separator = () => <View className="h-3" />;

/**
 * Shown when the wrong filter has nothing left to show. Passing this as a component rather
 * than an element keeps a React element (and the fiber it owns) out of the list's props,
 * which is what a snapshot of this screen serialises.
 */
function AllCorrect() {
  const { t } = useTranslation();
  return (
    <Stack className="pt-6">
      <Text variant="body" color="dim">
        {t('solutions.allCorrect')}
      </Text>
    </Stack>
  );
}

/**
 * Answers & explanation (F-13), pure: rows come in already joined to the paper, so the dev
 * gallery and the tests render the same component the route does.
 */
export function SolutionsView({
  rows,
  failed = false,
  initialFilter = 'wrong',
  onBack,
  onRetry,
}: SolutionsViewProps) {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<SolutionFilter>(initialFilter);
  const visible = useMemo(() => filterSolutionRows(rows ?? [], filter), [rows, filter]);
  const wrongCount = useMemo(() => (rows ?? []).filter((r) => !r.isCorrect).length, [rows]);

  const chips = rows && !failed && (
    <Row gap={2} className="px-3 pb-2" testID="solutions-filters">
      <Chip
        size="md"
        label={t('solutions.filterWrong')}
        count={wrongCount}
        active={filter === 'wrong'}
        onPress={() => setFilter('wrong')}
        testID="solutions-filter-wrong"
      />
      <Chip
        size="md"
        label={t('solutions.filterAll')}
        count={rows.length}
        active={filter === 'all'}
        onPress={() => setFilter('all')}
        testID="solutions-filter-all"
      />
    </Row>
  );

  return (
    <Screen testID="solutions-screen">
      <BackHeader title={t('solutions.title')} onBack={onBack} testID="solutions-header">
        {chips || null}
      </BackHeader>

      {failed ? (
        <LoadError onRetry={onRetry} testID="solutions-error" />
      ) : !rows ? (
        <Skeleton blocks={[...SKELETON]} testID="solutions-skeleton" />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(row) => String(row.questionNo)}
          renderItem={({ item }) => <SolutionCard row={item} />}
          ItemSeparatorComponent={Separator}
          contentContainerClassName="px-4 pb-6 pt-3"
          ListEmptyComponent={AllCorrect}
          testID="solutions-list"
        />
      )}
    </Screen>
  );
}
