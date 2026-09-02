import { size, spacing, type ColorName } from '@tslprb/design-tokens';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, View } from 'react-native';

import type { PaperQuestion } from '@/data/api';
import type { AttemptState, Choice } from '@/data/attempt';
import {
  counts,
  isSectionLocked,
  progressFraction,
  sectionOf,
  totalQuestions,
} from '@/data/attempt.selectors';
import {
  Button,
  Chip,
  cx,
  haptics,
  Num,
  ProgressRail,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
} from '@/ui';

/** Rail, timer box and toast turn flag-red from here down (spec section 5). */
const CRITICAL_SEC = 60;
/** Timer box turns hazard-orange from here down. */
const WARNING_SEC = 300;
/** The prototype's locked-tab glyph, appended to the section label. */
const LOCK_GLYPH = '  ⛌';

export type AttemptViewProps = {
  /** The persisted half of the attempt; every derived value comes from `attempt.selectors`. */
  attempt: AttemptState;
  /** The question on screen, unlocalized — the view picks the face for the live language. */
  question?: PaperQuestion;
  /** Whole seconds left on the deadline. */
  remainingSec: number;
  /** Whole seconds spent on the question on screen. */
  elapsedSec: number;
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  onExit: () => void;
  /** An unlocked section tab: jump to its first question. */
  onSectionPress: (sectionIndex: number) => void;
  /** A locked section tab: raise the locked toast. */
  onLockedTap: (sectionIndex: number) => void;
  onAnswer: (choice: Choice) => void;
  onClear: () => void;
  onToggleMark: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenPalette: () => void;
  /** Banner + toast, in flow directly under the header. */
  notices?: ReactNode;
  /** Dialogs, palette sheet and the call overlay — handed to `Screen`'s overlay slot. */
  overlay?: ReactNode;
  testID?: string;
};

/** mm:ss, always two digits; 3504 s ⇒ "58:24". */
export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** The header clock: transparent, then hazard under 5 minutes, then flag under 1. */
function TimerBox({ remainingSec }: { remainingSec: number }) {
  const { t } = useTranslation();
  const critical = remainingSec <= CRITICAL_SEC;
  const warning = remainingSec <= WARNING_SEC;
  const filled = warning || critical;
  const fg: ColorName = filled ? 'tar' : 'chalk';
  return (
    <Stack
      align="end"
      gap={1}
      testID="timer-box"
      className={cx(
        'rounded-sm border px-2 py-1',
        critical ? 'border-flag bg-flag' : warning ? 'border-hazard bg-hazard' : 'border-line',
      )}
    >
      <Text variant="caption" weight="700" color={filled ? 'tar' : 'dim'} tracking="timer">
        {t('test.timeLeft')}
      </Text>
      <Num variant="timer" color={fg} testID="timer-value">
        {formatClock(remainingSec)}
      </Num>
    </Stack>
  );
}

/** "+1 / −0.25", or the free mock's "No negative marking". */
function MarksChip({ attempt }: { attempt: AttemptState }) {
  const { t } = useTranslation();
  const pattern = attempt.pattern;
  if (!pattern) return null;
  if (pattern.negativePerWrong <= 0)
    return (
      <View className="rounded-xs border border-line px-2 py-1" testID="marks-chip">
        <Text variant="caption" weight="600" color="dim">
          {t('common.noNegative')}
        </Text>
      </View>
    );
  return (
    <Row
      physical
      gap={1}
      align="center"
      className="rounded-xs border border-line px-2 py-1"
      testID="marks-chip"
    >
      <Num variant="caption" color="hivis">{`+${pattern.marksPerCorrect}`}</Num>
      <Text variant="caption" color="ghost">
        /
      </Text>
      <Num variant="caption" color="flag">{`−${pattern.negativePerWrong}`}</Num>
    </Row>
  );
}

/**
 * The test-attempt screen, pure: every value is a prop and every action is a callback, so the
 * route, the tests and the dev states gallery all render the same component.
 */
export function AttemptView({
  attempt,
  question,
  remainingSec,
  elapsedSec,
  lang,
  onLangChange,
  onExit,
  onSectionPress,
  onLockedTap,
  onAnswer,
  onClear,
  onToggleMark,
  onPrev,
  onNext,
  onOpenPalette,
  notices,
  overlay,
  testID = 'attempt-screen',
}: AttemptViewProps) {
  const { t } = useTranslation();
  const d = useDir();

  const sections = attempt.pattern?.sections ?? [];
  const current = attempt.current;
  const currentSection = sectionOf(attempt, current);
  const isMarked = attempt.marked[current] === true;
  const answer = attempt.answers[current];
  const tally = counts(attempt);
  const total = totalQuestions(attempt);

  // `returnObjects` is on globally (packages/i18n), so this key resolves to the 4 glyphs.
  const optionKeys = t('test.optionKeys', { returnObjects: true }) as unknown as string[];
  const langOptions = LANGS.map((l) => ({ value: l, label: t(`lang.${l}Short`), lang: l }));

  const options = question?.options[lang] ?? [];

  return (
    <Screen rail critical={remainingSec <= CRITICAL_SEC} overlay={overlay} testID={testID}>
      <View className="border-b border-line bg-panel" testID="attempt-header">
        <Row align="center" gap={2} className="px-2 py-1" testID="attempt-header-row">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('test.exit')}
            onPress={onExit}
            testID="btn-exit"
            className="h-touch w-touch items-center justify-center"
            style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
          >
            <Text variant="glyph" color="dim">
              ✕
            </Text>
          </Pressable>
          <SegmentedChips
            value={lang}
            onChange={onLangChange}
            options={langOptions}
            testID="attempt-lang"
          />
          <View className="flex-1" />
          <TimerBox remainingSec={remainingSec} />
        </Row>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          testID="section-tabs"
          contentContainerStyle={{
            flexDirection: d.row,
            gap: spacing['2'],
            paddingHorizontal: spacing['3'],
            paddingBottom: spacing['2'],
          }}
        >
          {sections.map((s, i) => {
            const locked = isSectionLocked(attempt, i);
            return (
              <Chip
                key={s.id}
                size="lg"
                label={locked ? `${t(s.labelKey)}${LOCK_GLYPH}` : t(s.labelKey)}
                active={i === currentSection}
                muted={locked}
                onPress={() => (locked ? onLockedTap(i) : onSectionPress(i))}
                testID={`section-chip-${i}`}
              />
            );
          })}
        </ScrollView>

        <ProgressRail
          fraction={progressFraction(attempt)}
          ticks={Math.max(1, sections.length)}
          testID="attempt-progress"
        />
      </View>

      {notices}

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing['4'], paddingBottom: spacing['5'] }}
        testID="attempt-body"
      >
        <Row gap={2} wrap align="center">
          <Row
            physical
            gap={1}
            align="center"
            className="rounded-xs border-2 border-hivis px-2 py-1"
            testID="q-badge"
          >
            <Text variant="small" weight="700" color="hivis" tracking="kickerTight">
              {t('test.qLabel')}
            </Text>
            <Num variant="small" color="hivis" tracking="kickerTight">
              {current}
            </Num>
          </Row>
          <MarksChip attempt={attempt} />
          {isMarked && (
            <Chip label={t('test.markedShort')} tone="hazard" active testID="marked-chip" />
          )}
        </Row>

        <Text variant="question" className="mt-3" testID="question-text">
          {question?.text[lang] ?? ''}
        </Text>

        <Stack gap={3} className="mt-4" accessibilityRole="radiogroup">
          {options.map((label, i) => {
            const selected = answer === i;
            return (
              <Pressable
                key={`${i}-${label}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${optionKeys[i] ?? ''} ${label}`}
                testID={`option-${i}`}
                onPress={() => {
                  haptics.select();
                  onAnswer(i as Choice);
                }}
                className={cx(
                  'justify-center rounded-md py-3',
                  // Border grows 1 → 2 px when selected; padding gives the pixel back.
                  selected
                    ? 'border-2 border-hivis bg-hivisTint px-3'
                    : 'border border-line bg-panel2 px-4',
                )}
                style={({ pressed }) => [
                  { minHeight: size.key },
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Row gap={3} align="center">
                  <View
                    className={cx(
                      'items-center justify-center rounded-sm border',
                      selected ? 'border-hivis bg-hivis' : 'border-line3',
                    )}
                    style={{ width: size.optionKey, height: size.optionKey }}
                  >
                    <Text
                      variant="small"
                      weight="700"
                      color={selected ? 'tar' : 'dim'}
                      align="center"
                    >
                      {optionKeys[i] ?? ''}
                    </Text>
                  </View>
                  <Text variant="bodyLg" className="flex-1">
                    {label}
                  </Text>
                </Row>
              </Pressable>
            );
          })}
        </Stack>

        <Row gap={2} align="center" className="mt-4" testID="time-on-question">
          {/* Decorative ring: `mute` is reserved for non-text marks like this one. */}
          <View
            className="h-dot w-dot rounded-full border-1.5 border-mute"
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="caption" color="dim">
            {`${t('test.timeOnQ')} ·`}
          </Text>
          <Num variant="caption" weight="400" color="dim">
            {t('common.seconds', { count: elapsedSec })}
          </Num>
        </Row>
      </ScrollView>

      <View className="border-t border-line bg-panel px-3 pb-3 pt-2" testID="attempt-footer">
        <Stack gap={2}>
          <Row gap={2}>
            <Button
              variant="secondary"
              label={t('test.clear')}
              onPress={onClear}
              style={{ width: size.clearBtn }}
              testID="btn-clear"
            />
            <Button
              variant="hazard"
              active={isMarked}
              label={isMarked ? t('test.unmark') : t('test.mark')}
              onPress={onToggleMark}
              className="flex-1"
              testID="btn-mark"
            />
          </Row>
          <Row gap={2}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('test.previous')}
              onPress={onPrev}
              testID="btn-prev"
              className="h-touchLg w-touchLg items-center justify-center rounded-sm border border-line3"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
            >
              <Text variant="glyph" color="chalk">
                {d.chevronPrev}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${t('test.palette')} ${tally.answered}/${total}`}
              onPress={onOpenPalette}
              testID="btn-palette"
              className="h-touchLg flex-1 items-center justify-center rounded-sm border border-line3"
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
            >
              <Text variant="body" weight="600">
                {t('test.palette')}
              </Text>
              <Num variant="caption" weight="400" color="dim">
                {`${tally.answered} / ${total}`}
              </Num>
            </Pressable>
            <Button
              size="lg"
              label={t('test.next')}
              icon={
                <Text variant="glyph" color="tar">
                  {d.chevronNext}
                </Text>
              }
              onPress={onNext}
              style={{ width: size.nextBtn }}
              testID="btn-next"
            />
          </Row>
        </Stack>
      </View>
    </Screen>
  );
}
