import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  radius,
  shadowStyle,
  size,
  spacing,
  text,
  type ColorName,
} from '@tslprb/design-tokens';
import { LANGS, useDir, type Lang } from '@tslprb/i18n';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  ActionBar,
  Button,
  Chip,
  cx,
  Duration,
  Glyph,
  haptics,
  HeaderBand,
  Num,
  Pill,
  pressedClass,
  pressedStyle,
  ProgressRail,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  usePressed,
} from '@/ui';

/** Band, timer box, progress fill and toast turn red from here down (spec section 5). */
const CRITICAL_SEC = 60;
/** Timer box turns gold from here down. */
const WARNING_SEC = 300;

export type AttemptViewProps = {
  /** The persisted half of the attempt; every derived value comes from `attempt.selectors`. */
  attempt: AttemptState;
  /** The question on screen, unlocalized — the view picks the face for the live language. */
  question?: PaperQuestion;
  /** Whole seconds left on the deadline. */
  remainingSec: number;
  /** Whole seconds spent on the question on screen. */
  elapsedSec: number;
  /**
   * False until the attempt has a deadline. An unarmed screen reads `remainingSec: 0`, which
   * must not raise the red timer box and the critical band before the paper has even started.
   */
  armed?: boolean;
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
  /**
   * Hand the paper in. It asks first (`dialog-submit`), so this opens the question rather than
   * ending the attempt; the palette sheet's own Submit opens the same one.
   */
  onSubmit: () => void;
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

/**
 * The header clock: a quiet `surface2` box, a soft-gold one under 5 minutes and a solid
 * `dangerInk` one under 1 — but only once the attempt is armed, so a not-yet-started paper
 * never shows a red 00:00.
 *
 * Ink carries the digits on both cream and gold (13.96:1 and 10.97:1); the fill is what
 * changes. `accentInk` on `accentSoft` measures 3.34:1 — inside AA for the 23 px bold numeral
 * but under it for the 12 px label above it, and a label darker than the figure it names is
 * the hierarchy upside down. The critical box is `dangerInk` with `onInk` (5.79:1), never
 * `danger` with cream (2.48:1).
 */
function TimerBox({ remainingSec, armed }: { remainingSec: number; armed: boolean }) {
  const { t } = useTranslation();
  const critical = armed && remainingSec <= CRITICAL_SEC;
  const warning = armed && !critical && remainingSec <= WARNING_SEC;
  const fg: ColorName = critical ? 'onInk' : 'ink';
  return (
    <Stack
      align="end"
      gap={1}
      testID="timer-box"
      className="px-2 py-1"
      // Fill and border are an object style so they survive css-interop on web and stay assertable.
      style={{
        borderRadius: radius.sm,
        borderWidth: 1,
        backgroundColor: critical
          ? colors.dangerInk
          : warning
            ? colors.accentSoft
            : colors.surface2,
        borderColor: critical
          ? colors.dangerInk
          : warning
            ? colors.accentStrong
            : colors.line,
      }}
    >
      <Text
        variant="caption"
        weight="700"
        color={critical ? 'onInk' : warning ? 'ink2' : 'ink3'}
        tracking="timer"
      >
        {t('test.timeLeft')}
      </Text>
      {/* The numeral's line-height is pinned to 1.0 so the box is the label plus the digits
          plus its own padding and nothing more — 55 px measured at 390 px, not the 48 the
          prototype's flat box was (fix wave 1, D9). It is a MINIMUM the Telugu label grows. */}
      <Num variant="timer" color={fg} testID="timer-value" style={{ lineHeight: text.timer }}>
        {formatClock(remainingSec)}
      </Num>
    </Stack>
  );
}

/**
 * The paper's marking scheme as a quiet pill: "+1 / −0.25", or the free mock's "No negative
 * marking".
 *
 * The reward is ink and the penalty `dangerInk` (5.35:1 on the pill's `surface2`). Not gold:
 * `accentInk` measures 4.25 there, and gold in this app means the candidate's own input, which
 * the exam's own marking scheme is not.
 */
function MarksPill({ attempt }: { attempt: AttemptState }) {
  const { t } = useTranslation();
  const pattern = attempt.pattern;
  if (!pattern) return null;
  if (pattern.negativePerWrong <= 0)
    return <Pill label={t('common.noNegative')} testID="marks-chip" />;
  return (
    <Pill
      testID="marks-chip"
      // Physical: "+1 / −0.25" is arithmetic and never re-orders with the reading direction.
      leading={
        <Row physical gap={1} align="baseline">
          <Num variant="caption" weight="700" color="ink">{`+${pattern.marksPerCorrect}`}</Num>
          <Text variant="caption" color="ink3">
            /
          </Text>
          <Num
            variant="caption"
            weight="700"
            color="dangerInk"
          >{`−${pattern.negativePerWrong}`}</Num>
        </Row>
      }
    />
  );
}

/**
 * One answer row: a `surface` box 58 px tall, its key in a bordered square, a 2 px
 * `accentStrong` edge and the gold tint when it is the candidate's answer.
 *
 * The resting border is `outline` (3.12:1 on the box, 3.01 on the canvas behind it), not the
 * `line` a card rests on: `surface` on `canvas` measures 1.06, so a `line` hairline would leave
 * four radio targets with no visible boundary at all. Selected is `accentStrong`, not the brand
 * `accent`, which is 2.34:1 against the cream around it (ruling D2).
 *
 * Held, an unselected row takes the `surface2` press fill — opacity is invisible between two
 * creams — and a selected one dims, so the tint the press is confirming survives it.
 */
function OptionRow({
  index,
  glyph,
  label,
  selected,
  onPress,
}: {
  index: number;
  glyph: string;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${glyph} ${label}`}
      testID={`option-${index}`}
      android_ripple={{ color: colors.accentTint }}
      {...handlers}
      onPress={() => {
        haptics.select();
        onPress();
      }}
      className={cx(
        'min-h-key justify-center rounded-md px-4 py-3',
        // Border grows 1 → 2 px when selected, so ONE pixel comes back off the padding, in the
        // style below — the same sum `Card` does. Handing back four (`px-3`) put the chosen
        // answer 3 px inside the rows above and below it (fix wave 1, D3).
        // One fill slot, never two `bg-*`: the tint, the press fill or the resting surface.
        selected
          ? 'border-2 border-accentStrong bg-accentTint'
          : cx('border border-outline', pressed ? pressedClass : 'bg-surface'),
      )}
      // Flattened object, never a callback: a `style` function loses its statics on web.
      // 15 + 2 px of border and 16 + 1 both land the key box on the same axis.
      style={StyleSheet.flatten([
        { minHeight: size.key },
        selected ? { paddingHorizontal: spacing['4'] - 1 } : null,
        selected && pressed ? pressedStyle : null,
      ])}
    >
      <Row gap={3} align="center">
        <View
          className={cx(
            'items-center justify-center rounded-sm border',
            selected ? 'border-accent bg-accent' : 'border-outline',
          )}
          style={{ width: size.optionKey, height: size.optionKey }}
        >
          {/* Ink on the gold key box (6.47:1). The key stays in the LANGUAGE's own face: it is
              a localised label, not a glyph — `test.optionKeys` is A–D in en and అ–ఈ in te, and
              Inter draws the Telugu letters as tofu. */}
          <Text variant="small" weight="700" color={selected ? 'ink' : 'ink3'} align="center">
            {glyph}
          </Text>
        </View>
        <Text variant="bodyLg" className="flex-1">
          {label}
        </Text>
      </Row>
    </Pressable>
  );
}

/**
 * A pressable whose press delta lives in state instead of a `style` callback: a callback
 * next to `className` silently loses its static values under css-interop on web (`usePressed`).
 *
 * The feedback is the `surface2` fill every outlined control on cream takes — an opacity dim
 * between two creams is invisible. One fill slot, so the caller's `className` carries no `bg-*`.
 */
function PressBox({
  className,
  accessibilityLabel,
  onPress,
  testID,
  children,
}: {
  className: string;
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
  children: ReactNode;
}) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: colors.accentTint }}
      onPress={onPress}
      testID={testID}
      {...handlers}
      className={cx(className, pressed && pressedClass)}
    >
      {children}
    </Pressable>
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
  armed = true,
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
  onSubmit,
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
  const critical = armed && remainingSec <= CRITICAL_SEC;

  return (
    /* `ActionBar` owns the bottom inset, the way a tab scene's bar does. */
    <Screen bottomInset={false} overlay={overlay} testID={testID}>
      {/* The last minute says so three times and none of them moves: this band, the solid red
          timer box and the red progress fill, with the pinned toast carrying the words. The
          pulsing `Rail` that used to sit here is gone (ruling 2026-09-05, Phase D).
          The band is ALWAYS rendered and only its fill changes: inserted into flow at the
          sixty-second mark it pushed the clock it was warning about 4 px down the screen
          (fix wave 1, D10). Motionless means the layout too, not just the paint. */}
      <HeaderBand critical={critical} />
      <View
        className="border-b border-line bg-surface"
        style={shadowStyle('card')}
        testID="attempt-header"
      >
        <Row align="center" gap={2} className="px-2 py-1" testID="attempt-header-row">
          <PressBox
            accessibilityLabel={t('test.exit')}
            onPress={onExit}
            testID="btn-exit"
            className="h-touch w-touch items-center justify-center rounded-sm"
          >
            {/* The icon, not a ✕ glyph: a close cross is a symbol every platform draws. */}
            <Ionicons
              name="close"
              size={size.iconLg}
              color={colors.ink2}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </PressBox>
          {/* `quiet`, not the hub header's gold: at five minutes the timer box beside it wears
              the same `accentSoft`, and two gold blocks in one row make the clock's change of
              state something to notice rather than something that shouts. In this row gold is
              the clock (F-31 fix wave, D6). The selected cell still marks itself, with the
              2 px `accentStrong` bottom edge every segmented tone carries. */}
          <SegmentedChips
            value={lang}
            onChange={onLangChange}
            options={langOptions}
            tone="quiet"
            testID="attempt-lang"
          />
          <View className="flex-1" />
          <TimerBox remainingSec={remainingSec} armed={armed} />
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
                shape="pill"
                label={t(s.labelKey)}
                // The lock is an icon in the chip's own leading slot, not two spaces and a `⛌`
                // concatenated onto a translated label: only the Latin face carries that glyph,
                // and a padded string is not a mark.
                leading={
                  locked ? (
                    <Ionicons
                      testID={`section-lock-${i}`}
                      name="lock-closed-outline"
                      size={size.icon}
                      color={colors.ink3}
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                    />
                  ) : undefined
                }
                active={i === currentSection}
                muted={locked}
                onPress={() => (locked ? onLockedTap(i) : onSectionPress(i))}
                testID={`section-chip-${i}`}
              />
            );
          })}
          {/* Trailing gutter so a clipped last chip reads as "there is more to scroll". */}
          <View style={{ width: spacing['4'] }} />
        </ScrollView>

        <ProgressRail
          fraction={progressFraction(attempt)}
          ticks={Math.max(1, sections.length)}
          tone={critical ? 'danger' : 'accent'}
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
          {/* The same Q pill the paper viewer heads its cards with. */}
          <Pill
            testID="q-badge"
            leading={
              // "Q" and its number sit on one baseline: two faces at one size, which the
              // pattern's own centring Row cannot lock for them (fix wave 1, C4).
              <Row gap={1} align="baseline">
                <Text variant="caption" weight="700" color="ink3" tracking="kicker">
                  {t('test.qLabel')}
                </Text>
                <Num variant="caption" weight="700" color="ink3" tracking="none">
                  {current}
                </Num>
              </Row>
            }
          />
          <MarksPill attempt={attempt} />
          {/* Ink = a deliberate flag, and a filled bookmark says the flag is set. */}
          {isMarked && (
            <Pill
              testID="marked-chip"
              tone="ink"
              label={t('test.markedShort')}
              leading={
                <Ionicons
                  testID="marked-bookmark"
                  name="bookmark"
                  size={size.icon}
                  color={colors.onInk}
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                />
              }
            />
          )}
        </Row>

        <Text variant="question" className="mt-3" testID="question-text">
          {question?.text[lang] ?? ''}
        </Text>

        <Stack gap={3} className="mt-4" accessibilityRole="radiogroup">
          {options.map((label, i) => (
            <OptionRow
              key={`${i}-${label}`}
              index={i}
              glyph={optionKeys[i] ?? ''}
              label={label}
              selected={answer === i}
              onPress={() => onAnswer(i as Choice)}
            />
          ))}
        </Stack>

        <Row gap={2} align="center" className="mt-4" testID="time-on-question">
          {/* A clock, not a decorative ring: the mark names what the line counts. */}
          <Ionicons
            testID="time-on-question-icon"
            name="time-outline"
            size={size.icon}
            color={colors.ink3}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="caption" color="ink3">
            {`${t('test.timeOnQ')} ·`}
          </Text>
          {/* Digits in Inter, the unit in the language's own face: `common.seconds`
              inside `<Num>` drew the Telugu unit as tofu. */}
          <Duration seconds={elapsedSec} variant="caption" weight="400" color="ink3" />
        </Row>
      </ScrollView>

      {/* P5. The primary hugs its 112 px, so the remaining width goes to Prev + Questions. */}
      <ActionBar
        testID="attempt-footer"
        grow={false}
        secondary={
          <Row gap={2} align="center" className="flex-1">
            <PressBox
              accessibilityLabel={t('test.previous')}
              onPress={onPrev}
              testID="btn-prev"
              className="h-touchLg w-touchLg items-center justify-center rounded-sm border border-outline"
            >
              {/* Latin face: a language face without the chevron glyph draws a tofu box. */}
              <Glyph color="ink" testID="chevron-prev">
                {d.chevronPrev}
              </Glyph>
            </PressBox>
            <PressBox
              accessibilityLabel={`${t('test.palette')} ${tally.answered}/${total}`}
              onPress={onOpenPalette}
              testID="btn-palette"
              className="h-touchLg flex-1 items-center justify-center rounded-sm border border-outline"
            >
              <Text variant="body" weight="600">
                {t('test.palette')}
              </Text>
              <Num variant="caption" weight="400" color="ink3">
                {`${tally.answered} / ${total}`}
              </Num>
            </PressBox>
          </Row>
        }
        primary={
          <Button
            size="lg"
            label={t('test.next')}
            icon={
              <Glyph color="onInk" testID="chevron-next">
                {d.chevronNext}
              </Glyph>
            }
            onPress={onNext}
            style={{ width: size.nextBtn }}
            testID="btn-next"
          />
        }
      >
        <Row gap={2} align="center">
          <Button
            variant="ghost"
            label={t('test.clear')}
            onPress={onClear}
            style={{ width: size.clearBtn }}
            testID="btn-clear"
          />
          {/* Marking is a flag, not a second decision: the box stays outlined either way and
              the bookmark fills. A gold fill here would be the screen's second filled control
              and would claim the rank the ink Next already has. */}
          <Button
            variant="secondary"
            label={isMarked ? t('test.unmark') : t('test.mark')}
            icon={
              <Ionicons
                testID="btn-mark-icon"
                name={isMarked ? 'bookmark' : 'bookmark-outline'}
                size={size.icon}
                color={colors.ink}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            }
            onPress={onToggleMark}
            className="flex-1"
            testID="btn-mark"
          />
          {/* Handing the paper in used to live one tap deeper, inside the palette sheet, which
              made the one irreversible action on the screen the hardest to find. It sits here in
              every section now, outlined rather than filled: Next is pressed once per question
              and keeps the ink, this is pressed once per paper — and it asks before it acts. */}
          <Button
            variant="secondary"
            label={t('test.submit')}
            onPress={onSubmit}
            testID="btn-submit"
          />
        </Row>
      </ActionBar>
    </Screen>
  );
}
