import { colors, spacing } from '@tslprb/design-tokens';
import type { SectionSpec } from '@tslprb/fixtures';
import { useDir, type Lang } from '@tslprb/i18n';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, View, type ListRenderItemInfo } from 'react-native';

import type { PaperQuestion } from '@/data/api';
import { startEdge } from '@/features/result/edge';
import { BackHeader } from '@/features/result/Header';
import { LoadError, Skeleton } from '@/features/result/Placeholder';
import { Chip, Glyph, Kicker, Measure, Num, Row, Screen, Stack, Text } from '@/ui';

export type PaperViewProps = {
  /** The paper's own title, from `TESTS`. Falls back to the generic screen title. */
  title?: string;
  /** Omit while the paper is loading; the skeleton shows instead. */
  questions?: PaperQuestion[];
  /** Section order of the pattern the paper was built from — the jump chips. */
  sections?: SectionSpec[];
  /** Which language's face the stem, options and explanation are drawn in. */
  lang: Lang;
  /** No such paper, or the load failed: the not-found state replaces the body. */
  failed?: boolean;
  onBack?: () => void;
  onRetry?: () => void;
};

const SKELETON = ['chip', 'card', 'card', 'card'] as const;

/**
 * 0-based list index of the first question in section `i`, from the section sizes alone —
 * what `scrollToIndex` wants, not the question number the card is headed with.
 */
export function firstIndexOfSection(sections: SectionSpec[], i: number): number {
  return sections.slice(0, i).reduce((n, s) => n + s.questions, 0);
}

/**
 * One answer. The correct one carries the prototype's 3 px hi-vis start bar over the matching
 * tint and a ✓; the other three stay plain, because marking all four is marking none.
 *
 * The ✓ is decorative — a screen reader is told which option is correct by the row's own
 * label, not by a glyph it would read as "check mark".
 */
function Option({
  questionNo,
  index,
  glyph,
  label,
  correct,
  correctLabel,
}: {
  questionNo: number;
  index: number;
  glyph: string;
  label: string;
  correct: boolean;
  correctLabel: string;
}) {
  const d = useDir();
  return (
    <View
      testID={`paper-option-${questionNo}-${index}`}
      accessibilityLabel={correct ? `${glyph} · ${label} · ${correctLabel}` : `${glyph} · ${label}`}
      className="rounded-xs px-3 py-2"
      // Tint and mirrored bar are object styles, never a class: css-interop accumulates a
      // dynamic className next to a style array, and RN's `borderStartWidth` follows
      // `I18nManager` rather than the in-app language (`startEdge`).
      style={
        correct
          ? { backgroundColor: colors.hivisTint2, ...startEdge(d.isRTL, 'hivis') }
          : undefined
      }
    >
      <Row gap={3} align="center">
        <Text
          variant="small"
          weight="700"
          color={correct ? 'hivis' : 'dim'}
          lang="en"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {glyph}
        </Text>
        <Text
          variant="body"
          weight={correct ? '600' : '400'}
          color={correct ? 'chalk' : 'chalk2'}
          className="flex-1"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label}
        </Text>
        {correct && (
          <Glyph
            variant="small"
            weight="700"
            color="hivis"
            testID={`paper-tick-${questionNo}-${index}`}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ✓
          </Glyph>
        )}
      </Row>
    </View>
  );
}

/** One question, answered: kicker, stem, the four options with the key marked, and why. */
function QuestionCard({
  question,
  questionNo,
  lang,
}: {
  question: PaperQuestion;
  questionNo: number;
  lang: Lang;
}) {
  const { t } = useTranslation();
  const optionKeys = t('test.optionKeys', { returnObjects: true }) as unknown as string[];
  const correctLabel = t('solutions.correctAnswer');
  return (
    <View
      className="rounded-md border border-line bg-panel2 p-4"
      testID={`paper-card-${questionNo}`}
    >
      <Row gap={1} align="baseline">
        <Kicker tracking="kickerTight">{t('test.qLabel')}</Kicker>
        <Num variant="kicker" color="dim" tracking="none">
          {questionNo}
        </Num>
      </Row>

      {/* `question` carries the per-language size and line-height (en 1.45, te 1.6, ur 2.0). */}
      <Text variant="question" className="mt-3" testID={`paper-stem-${questionNo}`}>
        {question.text[lang]}
      </Text>

      <Stack gap={2} className="mt-3">
        {question.options[lang].map((label, i) => (
          <Option
            key={`${i}-${label}`}
            questionNo={questionNo}
            index={i}
            glyph={optionKeys[i] ?? ''}
            label={label}
            correct={i === question.correct}
            correctLabel={correctLabel}
          />
        ))}
      </Stack>

      <View className="mt-3 border-t border-panel3 pt-3">
        <Kicker color="sand" tracking="kicker">
          {t('paper.why')}
        </Kicker>
        <Text variant="body" color="chalk2" className="mt-2">
          {question.explanation[lang]}
        </Text>
      </View>
    </View>
  );
}

/** A 14 px gutter between cards. Hoisted: a `FlatList` slot must be a component, not an element. */
const Separator = () => <View className="h-3" />;

/**
 * F-22 — a previous year's paper, read rather than sat: every question with its answer key
 * and explanation already on it, free and with no attempt behind it.
 *
 * Pure, so the route, the tests and the dev gallery render the same component.
 */
export function PaperView({
  title,
  questions,
  sections = [],
  lang,
  failed = false,
  onBack,
  onRetry,
}: PaperViewProps) {
  const { t } = useTranslation();
  const d = useDir();
  const list = useRef<FlatList<PaperQuestion>>(null);
  /** Set while the one `scrollToIndex` retry is in flight — see `onScrollToIndexFailed`. */
  const retrying = useRef(false);

  /**
   * Jump to a section's first question. `getItemLayout` is off the table — a card's height
   * depends on its stem, its four options and an explanation in three different scripts, and
   * a wrong constant would put every jump in the wrong place — so on a long paper the list
   * may not have measured that far yet. `onScrollToIndexFailed` below catches that and
   * scrolls to the list's own average-length estimate, which lands inside the section and
   * mounts the rows around it, rather than doing nothing.
   */
  const jump = useCallback(
    (sectionIndex: number) => {
      const index = firstIndexOfSection(sections, sectionIndex);
      if (index >= (questions?.length ?? 0)) return;
      list.current?.scrollToIndex({ index, animated: false });
    },
    [questions?.length, sections],
  );

  const onScrollToIndexFailed = useCallback(
    (info: { index: number; averageItemLength: number }) => {
      list.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      // The estimate only lands *near* the section; the rows it mounts are what the list needs
      // to measure before it can land on the card itself. So retry once on the next frame,
      // when those rows exist. `scrollToIndex` calls this handler back synchronously when it
      // fails, hence the flag: a retry that misses again settles for the offset rather than
      // scheduling a third jump that would only shuffle the page.
      if (retrying.current) return;
      requestAnimationFrame(() => {
        retrying.current = true;
        list.current?.scrollToIndex({ index: info.index, animated: false });
        retrying.current = false;
      });
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<PaperQuestion>) => (
      <QuestionCard question={item} questionNo={index + 1} lang={lang} />
    ),
    [lang],
  );

  const header = questions && !failed && (
    <>
      <Measure
        value={questions.length}
        unit={t('paper.questions')}
        // `px-4`, the cards' own gutter: the count and the jump chips are the head of the
        // list, so they have to start on the same line the cards start on.
        className="px-4 pb-2"
        testID="paper-count"
      />
      {sections.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          accessibilityLabel={t('paper.section')}
          testID="paper-sections"
          contentContainerStyle={{
            flexDirection: d.row,
            gap: spacing['2'],
            paddingHorizontal: spacing['4'],
            paddingBottom: spacing['2'],
          }}
        >
          {sections.map((s, i) => (
            <Chip
              key={s.id}
              size="lg"
              label={t(s.labelKey)}
              onPress={() => jump(i)}
              testID={`paper-section-${i}`}
            />
          ))}
          {/* Trailing gutter so a clipped last chip reads as "there is more to scroll". */}
          <View style={{ width: spacing['4'] }} />
        </ScrollView>
      )}
    </>
  );

  return (
    <Screen testID="paper-screen">
      <BackHeader title={title ?? t('paper.title')} onBack={onBack} testID="paper-header">
        {header || null}
      </BackHeader>

      {failed ? (
        <LoadError message={t('paper.notFound')} onRetry={onRetry} testID="paper-not-found" />
      ) : !questions ? (
        <Skeleton blocks={[...SKELETON]} testID="paper-skeleton" />
      ) : (
        <FlatList
          ref={list}
          data={questions}
          keyExtractor={(question, index) => `${index + 1}-${question.id}`}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          onScrollToIndexFailed={onScrollToIndexFailed}
          contentContainerClassName="px-4 pb-6 pt-3"
          showsVerticalScrollIndicator={false}
          testID="paper-list"
        />
      )}
    </Screen>
  );
}
