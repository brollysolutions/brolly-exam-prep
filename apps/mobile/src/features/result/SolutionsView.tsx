import { colors, spacing } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, View } from 'react-native';

import {
  BackHeader,
  Card,
  Chip,
  Duration,
  EmptyState,
  Glyph,
  Kicker,
  LoadError,
  Num,
  Pill,
  Row,
  Screen,
  Skeleton,
  Stack,
  Text,
} from '@/ui';

import { startEdge, startEdgeInset } from './edge';
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

/**
 * The verdict on a card: a 28 px disc, gold with an ink ✓ (6.47:1) or `dangerInk` with a cream
 * ✕ (5.79:1). Never a cream tick on `danger`, which measures 2.77:1.
 *
 * ✓ / ✕ are drawn in the Latin face, the one face guaranteed to carry both glyphs.
 */
function Badge({ correct }: { correct: boolean }) {
  return (
    <View
      testID={correct ? 'solution-badge-correct' : 'solution-badge-wrong'}
      className={
        correct
          ? 'h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent'
          : 'h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dangerInk'
      }
    >
      <Glyph
        variant="small"
        weight="700"
        color={correct ? 'ink' : 'onInk'}
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
 * The tinted answer blocks: a 3 px start bar over a matching tint — `dangerInk` over
 * `dangerTint` for the answer given, `accentStrong` over `accentTint` for the key.
 *
 * Both kickers are ink. Red text on the red tint is 4.29:1 and gold text on the gold tint
 * 4.14:1 — under AA for kicker-sized text either way (fix wave 1, C2). The 3 px bar and the
 * tint already say which block is which, so the label does not have to.
 *
 * The box draws no border of its own, so all three of the bar's pixels come back off the
 * reading-side padding and the two blocks' text starts on one axis (ruling D8, F-30).
 */
function AnswerBlock({
  tone,
  label,
  text,
  className,
  testID,
}: {
  tone: 'danger' | 'accent';
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
        backgroundColor: tone === 'danger' ? colors.dangerTint : colors.accentTint,
        ...startEdge(d.isRTL, tone === 'danger' ? 'dangerInk' : 'accentStrong'),
        ...startEdgeInset(d.isRTL, spacing['3']),
      }}
    >
      <Kicker color="ink" tracking="kickerTight">
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
    <Card testID="solution-card">
      <Row gap={2} align="center">
        <Badge correct={row.isCorrect} />
        {/* The paper viewer's Q pill. */}
        <Pill
          leading={
            <>
              <Text variant="caption" weight="700" color="ink3" tracking="kicker">
                {t('test.qLabel')}
              </Text>
              <Num variant="caption" weight="700" color="ink3" tracking="none">
                {row.questionNo}
              </Num>
            </>
          }
        />
      </Row>

      <Text variant="bodyLg" className="mt-3">
        {row.question.text[d.lang]}
      </Text>

      {!row.isCorrect && row.your !== null && (
        <AnswerBlock
          tone="danger"
          label={t('solutions.yourAnswer')}
          text={label(row.your)}
          className="mt-3 rounded-sm px-3 py-2"
          testID="solution-your-answer"
        />
      )}

      <AnswerBlock
        tone="accent"
        label={t('solutions.correctAnswer')}
        text={label(row.correct)}
        className="mt-2 rounded-sm px-3 py-2"
        testID="solution-correct-answer"
      />

      <Stack gap={2} className="mt-3 border-t border-line pt-3">
        {/* The paper viewer's "Why" pill: the gold `sand` kicker was the last of that alias. */}
        <Pill label={t('solutions.why')} />
        <Text variant="body" color="ink2">
          {row.question.explanation[d.lang]}
        </Text>
      </Stack>

      <Row gap={1} wrap align="baseline" className="mt-3">
        <Text variant="caption" color="ink3">
          {t('solutions.yourTime')}
        </Text>
        <Duration seconds={row.seconds} testID="solution-your-time" />
        <Glyph variant="caption" color="ink3">
          ·
        </Glyph>
        <Text variant="caption" color="ink3">
          {t('solutions.avgTime')}
        </Text>
        <Duration seconds={row.question.avgSeconds} testID="solution-avg-time" />
      </Row>
    </Card>
  );
}

/** A 14 px gutter between cards. Hoisted: a `FlatList` slot must be a component, not an element. */
const Separator = () => <View className="h-3" />;

/**
 * Shown when the wrong filter has nothing left to show — P6, the same shape every other empty
 * screen wears. The dot is `ok`, because nothing has gone wrong here: the shelf is empty
 * because every answer was right.
 *
 * Passing this as a component rather than an element keeps a React element (and the fiber it
 * owns) out of the list's props, which is what a snapshot of this screen serialises.
 */
function AllCorrect() {
  const { t } = useTranslation();
  return <EmptyState message={t('solutions.allCorrect')} dotTone="ok" testID="solutions-empty" />;
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
        shape="pill"
        label={t('solutions.filterWrong')}
        count={wrongCount}
        active={filter === 'wrong'}
        onPress={() => setFilter('wrong')}
        testID="solutions-filter-wrong"
      />
      <Chip
        size="md"
        shape="pill"
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
          // `flexGrow` so the empty state centres in the space the cards would have filled,
          // rather than sitting in the top corner of a list with no rows.
          contentContainerStyle={{
            paddingHorizontal: spacing['4'],
            paddingBottom: spacing['6'],
            paddingTop: spacing['3'],
            flexGrow: 1,
          }}
          ListEmptyComponent={AllCorrect}
          testID="solutions-list"
        />
      )}
    </Screen>
  );
}
