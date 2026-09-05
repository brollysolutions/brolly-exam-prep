import { colors, motion, size as sizes, typography, type ColorName } from '@tslprb/design-tokens';
import {
  allVerified,
  standardEntries,
  standardsFor,
  STANDARDS_NOTIFICATION_YEAR,
  type Gender,
  type Post,
  type Standard,
  type StandardKey,
  type StandardsGroup,
} from '@tslprb/fixtures';
import { useDir } from '@tslprb/i18n';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View, type LayoutChangeEvent } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { BackHeader } from '@/features/result/Header';
import {
  Button,
  Chip,
  cx,
  Glyph,
  iso,
  Kicker,
  Measure,
  Num,
  Row,
  Screen,
  SegmentedChips,
  Stack,
  Text,
  useMotion,
} from '@/ui';

import type { EligibilityRow, Evaluation, MeasureValues, Verdict } from './evaluate';
import { formatRunTime, isLongRun, joinRunTime, splitRunTime } from './runTime';

/** The unit each standard is measured in; also the `eligibility.*` key that names it. */
const UNIT: Record<StandardKey, 'cm' | 'm' | 's'> = {
  height: 'cm',
  chest: 'cm',
  chestExpansion: 'cm',
  run1600m: 's',
  run800m: 's',
  run100m: 's',
  longJump: 'm',
  shotPut: 'm',
};

/** The run events' distances in metres — a number passed into `eligibility.run`, never typed
 *  into a locale string, so it goes through `iso()` like every other digit. */
const RUN_M: Partial<Record<StandardKey, number>> = {
  run1600m: 1600,
  run800m: 800,
  run100m: 100,
};

/** `eligibility.*` key for each non-run standard's name. */
const LABEL: Partial<Record<StandardKey, string>> = {
  height: 'height',
  chest: 'chest',
  chestExpansion: 'chestExpansion',
  longJump: 'longJump',
  shotPut: 'shotPut',
};

/**
 * Digits are typed in the Latin face in every language, like every other number in the app:
 * the standards are printed in Latin figures on the notification and on the measuring tape.
 * The writing direction stays LTR for the same reason; only the caret's side follows the
 * reading direction (see `MeasureInput`).
 */
const INPUT_STYLE = StyleSheet.flatten([
  typography('en', 'field', '600'),
  {
    color: colors.chalk,
    height: sizes.touchLg,
    padding: 0,
    textAlignVertical: 'center' as const,
    writingDirection: 'ltr' as const,
  },
]);

/** Longest sane entry is "167.6"; the cap stops a paste from turning a height into a novel. */
const MAX_DIGITS = 6;

/** Minutes and seconds are whole numbers; three digits is already a very slow run. */
const MAX_RUN_DIGITS = 3;

/** Gap between the verdict's top edge and the top of the screen once scrolled to it. */
const VERDICT_MARGIN = 16;

/**
 * The one text input. Its caret sits on the reading-start side (the right under RTL) while
 * the digits themselves stay LTR; a hard-coded `textAlign: 'left'` put the caret on the far
 * side of every RTL field (design review 4).
 */
function MeasureInput({
  value,
  onChange,
  placeholder,
  accessibilityLabel,
  whole = false,
  testID,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accessibilityLabel: string;
  /** Whole numbers only (minutes, seconds): a number pad, no decimal key. */
  whole?: boolean;
  testID: string;
}) {
  const d = useDir();
  // Focus lives in state rather than in a `style` callback: a callback next to `className`
  // loses its static values under css-interop on web (see `usePressed`).
  const [focused, setFocused] = useState(false);
  return (
    <View
      className={cx(
        'h-touchLg flex-1 justify-center rounded-sm border bg-panel2 px-3',
        focused ? 'border-hivis' : 'border-line',
      )}
    >
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={whole ? 'number-pad' : 'decimal-pad'}
        inputMode={whole ? 'numeric' : 'decimal'}
        maxLength={whole ? MAX_RUN_DIGITS : MAX_DIGITS}
        accessibilityLabel={accessibilityLabel}
        selectionColor={colors.hivis}
        placeholder={placeholder}
        placeholderTextColor={colors.ghost}
        style={StyleSheet.flatten([INPUT_STYLE, { textAlign: d.textAlign }])}
      />
    </View>
  );
}

/** A label and a unit over one field. Everything but the long runs. */
function MeasureField({
  label,
  unit,
  standard,
  value,
  onChange,
  testID,
}: {
  label: string;
  unit: string;
  standard: number;
  value: string;
  onChange: (value: string) => void;
  testID: string;
}) {
  return (
    <Stack gap={1}>
      <Row gap={2} align="baseline">
        <Text variant="body" weight="600" color="chalk2">
          {label}
        </Text>
        <Text variant="caption" color="dim">
          {unit}
        </Text>
      </Row>
      <Row>
        <MeasureInput
          testID={testID}
          value={value}
          onChange={onChange}
          // The standard's own figure: what a plausible entry looks like.
          placeholder={String(standard)}
          accessibilityLabel={`${label} (${unit})`}
        />
      </Row>
    </Stack>
  );
}

/**
 * The 1600 m and 800 m as minutes and seconds, side by side, stored as seconds.
 *
 * A single seconds field read "7.15" — the way the notification writes 7 min 15 s — as
 * 7.15 s and passed it (review I4). The two fields are local state seeded from the stored
 * seconds and joined on every edit; a store value that stops matching what was typed (a
 * reset, a returning user) re-seeds them.
 */
function RunTimeField({
  label,
  standard,
  value,
  onChange,
  testID,
}: {
  label: string;
  standard: number;
  value: string;
  onChange: (value: string) => void;
  testID: string;
}) {
  const { t } = useTranslation();
  const [parts, setParts] = useState(() => splitRunTime(value));
  // Re-seed from the store only when ITS value moves to something the fields did not
  // produce (a reset, a returning user) — adjusted during render, the way React adjusts
  // state to a changed prop, rather than in an effect that would fight every keystroke.
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    if (joinRunTime(parts.min, parts.sec) !== value) setParts(splitRunTime(value));
  }
  const edit = (next: { min: string; sec: string }) => {
    setParts(next);
    onChange(joinRunTime(next.min, next.sec));
  };
  const hint = splitRunTime(String(standard));
  const minutes = t('eligibility.min');
  const seconds = t('eligibility.sec');
  return (
    <Stack gap={1}>
      <Text variant="body" weight="600" color="chalk2">
        {label}
      </Text>
      <Row gap={2}>
        <Stack gap={1} className="flex-1">
          <MeasureInput
            testID={`${testID}-min`}
            value={parts.min}
            onChange={(min) => edit({ ...parts, min })}
            placeholder={hint.min}
            accessibilityLabel={`${label} (${minutes})`}
            whole
          />
          <Text variant="caption" color="dim">
            {minutes}
          </Text>
        </Stack>
        <Stack gap={1} className="flex-1">
          <MeasureInput
            testID={`${testID}-sec`}
            value={parts.sec}
            onChange={(sec) => edit({ ...parts, sec })}
            placeholder={hint.sec}
            accessibilityLabel={`${label} (${seconds})`}
            whole
          />
          <Text variant="caption" color="dim">
            {seconds}
          </Text>
        </Stack>
      </Row>
    </Stack>
  );
}

const rowTone = (pass: boolean | undefined): ColorName =>
  pass === true ? 'hivis' : pass === false ? 'flag' : 'dim';

const rowGlyph = (pass: boolean | undefined): string =>
  pass === true ? '✓' : pass === false ? '✕' : '·';

/** A figure on a result row: `7:15` for a long run, `167.6 cm` for everything else. */
function Figure({
  rowKey,
  value,
  unit,
  color,
  testID,
}: {
  rowKey: StandardKey;
  value: number | string;
  unit: string;
  color: ColorName;
  testID?: string;
}) {
  if (isLongRun(rowKey)) {
    return (
      <Num variant="caption" weight="600" color={color} testID={testID}>
        {formatRunTime(Number(value))}
      </Num>
    );
  }
  return <Measure testID={testID} value={value} unit={unit} variant="caption" color={color} />;
}

/**
 * One standard: the mark in its own column, the name, then the required and entered figures
 * in two fixed columns so the tabular digits line up down the block. A hairline rules every
 * row off the next but the last.
 */
function ResultRow({
  row,
  label,
  unit,
  last,
}: {
  row: EligibilityRow;
  label: string;
  unit: string;
  last: boolean;
}) {
  const { t } = useTranslation();
  const d = useDir();
  const tone = rowTone(row.pass);
  const state =
    row.pass === true
      ? t('eligibility.pass')
      : row.pass === false
        ? t('eligibility.fail')
        : t('eligibility.notEntered');
  // A column's figures sit on its reading-end edge (the left under RTL).
  const end = d.isRTL ? 'start' : 'end';
  return (
    <Row
      testID={`eligibility-row-${row.key}`}
      gap={2}
      align="center"
      className={cx('py-3', !last && 'border-b border-line2')}
    >
      <View testID={`eligibility-mark-${row.key}`} className="w-6 items-center">
        <Glyph variant="question" color={tone} accessibilityLabel={state}>
          {rowGlyph(row.pass)}
        </Glyph>
      </View>
      <Row gap={2} align="center" wrap className="flex-1">
        <Text variant="body" weight="600">
          {label}
        </Text>
        {!row.verified && (
          <Chip
            label={t('eligibility.unverified')}
            tone="label"
            testID={`eligibility-unverified-${row.key}`}
          />
        )}
      </Row>
      <Stack gap={1} align={end} className="w-16">
        <Text variant="caption" color="dim">
          {t('eligibility.required')}
        </Text>
        <Figure rowKey={row.key} value={row.required} unit={unit} color="dim" />
      </Stack>
      <Stack gap={1} align={end} className="w-16">
        <Text variant="caption" color="dim">
          {t('eligibility.yours')}
        </Text>
        {row.actual === undefined ? (
          <Glyph variant="caption" color="dim">
            —
          </Glyph>
        ) : (
          <Figure
            rowKey={row.key}
            value={row.actual}
            unit={unit}
            color={tone}
            testID={`eligibility-yours-${row.key}`}
          />
        )}
      </Stack>
    </Row>
  );
}

const VERDICT: Record<Verdict, { box: string; color: ColorName; glyph: string }> = {
  eligible: { box: 'border-hivis bg-hivisTint', color: 'hivis', glyph: '✓' },
  notYet: { box: 'border-flag bg-flagTint', color: 'flag', glyph: '✕' },
  incomplete: { box: 'border-line bg-panel2', color: 'dim', glyph: '·' },
};

function VerdictBanner({
  result,
  labelOf,
}: {
  result: Evaluation;
  labelOf: (key: StandardKey) => string;
}) {
  const { t } = useTranslation();
  const tone = VERDICT[result.verdict];
  return (
    <Stack
      testID="eligibility-verdict"
      gap={3}
      accessibilityLiveRegion="polite"
      className={cx('rounded-md border p-4', tone.box)}
    >
      <Row gap={2} align="center">
        <Glyph color={tone.color} accessibilityElementsHidden importantForAccessibility="no">
          {tone.glyph}
        </Glyph>
        <Text variant="subtitle" weight="700" color={tone.color} className="flex-1">
          {t(`eligibility.${result.verdict}`)}
        </Text>
      </Row>
      {result.improve.length > 0 && (
        <Stack gap={2}>
          <Kicker>{t('eligibility.improve')}</Kicker>
          {result.improve.map((key) => (
            <Row key={key} testID={`eligibility-improve-${key}`} gap={2} align="baseline">
              <Glyph
                variant="caption"
                color="hazard"
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                ■
              </Glyph>
              <Text variant="small" color="chalk2" className="flex-1">
                {labelOf(key)}
              </Text>
            </Row>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

export type EligibilityViewProps = {
  post: Post;
  gender: Gender;
  group: StandardsGroup;
  /** Field text keyed by the standard it answers — seconds for the runs, as typed otherwise. */
  values: MeasureValues;
  /** The verdict to show; omitted until Check has been pressed. */
  result?: Evaluation;
  onPost: (post: Post) => void;
  onGender: (gender: Gender) => void;
  onGroup: (group: StandardsGroup) => void;
  onChange: (key: StandardKey, value: string) => void;
  onCheck: () => void;
  onBack?: () => void;
};

/**
 * F-25 — "do I meet the PMT/PET standards?", answered before the trip to the ground.
 *
 * Free for guests: it measures a body against a published table, so there is nothing here an
 * account could hold. The fields on screen come from `standardEntries`, the same list the
 * checker measures against, so the two can never disagree about whether a woman is asked for a
 * chest measurement or a constable for the SI-only 100 m. A figure the research could not
 * confirm is tagged on its row, and a table with any such figure carries a note under the
 * pickers (`allVerified`).
 */
export function EligibilityView({
  post,
  gender,
  group,
  values,
  result,
  onPost,
  onGender,
  onGroup,
  onChange,
  onCheck,
  onBack,
}: EligibilityViewProps) {
  const { t } = useTranslation();
  const m = useMotion();
  const standards = standardsFor(post, gender, group);
  const entries = standardEntries(standards);
  const labelOf = (key: StandardKey) => {
    const metres = RUN_M[key];
    return metres === undefined
      ? t(`eligibility.${LABEL[key]}`)
      : t('eligibility.run', { m: iso(metres) });
  };
  const unitOf = (key: StandardKey) => t(`eligibility.${UNIT[key]}`);

  /**
   * The verdict renders below the fold, under the button. Pressing Check asks for a scroll;
   * it happens once the verdict has a position — immediately if it is already on screen,
   * otherwise from its first `onLayout` — a frame later, so the layout has settled.
   */
  const scroller = useRef<ScrollView>(null);
  const verdictY = useRef<number | undefined>(undefined);
  const scrollWanted = useRef(false);
  const scrollToVerdict = () => {
    const y = verdictY.current;
    if (y === undefined) return;
    scrollWanted.current = false;
    requestAnimationFrame(() => {
      scroller.current?.scrollTo({ y: Math.max(0, y - VERDICT_MARGIN), animated: !m.reduced });
    });
  };
  const check = () => {
    onCheck();
    scrollWanted.current = true;
    if (result) scrollToVerdict();
  };
  const onVerdictLayout = (e: LayoutChangeEvent) => {
    verdictY.current = e.nativeEvent.layout.y;
    if (scrollWanted.current) scrollToVerdict();
  };

  const field = (key: StandardKey, standard: Standard) =>
    isLongRun(key) ? (
      <RunTimeField
        key={key}
        testID={`eligibility-field-${key}`}
        label={labelOf(key)}
        standard={standard.value}
        value={values[key] ?? ''}
        onChange={(text) => onChange(key, text)}
      />
    ) : (
      <MeasureField
        key={key}
        testID={`eligibility-field-${key}`}
        label={labelOf(key)}
        unit={unitOf(key)}
        standard={standard.value}
        value={values[key] ?? ''}
        onChange={(text) => onChange(key, text)}
      />
    );

  return (
    <Screen testID="eligibility-screen">
      <BackHeader testID="eligibility-header" title={t('eligibility.title')} onBack={onBack} />
      <ScrollView
        ref={scroller}
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-4"
        keyboardShouldPersistTaps="handled"
        // Up to seven fields and a numeric keyboard: without this the last of them sits under the
        // keypad on iOS. Android resizes the window itself; the prop is ignored there.
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <Text variant="small" color="dim">
          {t('eligibility.sub')}
        </Text>

        {/* Quiet, full-width pickers: three yellow blocks over the one yellow action would
            leave the screen with nothing to point at. */}
        <Stack gap={4} className="mt-6">
          <Stack gap={2}>
            <Kicker>{t('eligibility.post')}</Kicker>
            <SegmentedChips
              testID="eligibility-post"
              tone="quiet"
              block
              value={post}
              onChange={onPost}
              options={[
                { value: 'pc', label: t('onboarding.pcTitle') },
                { value: 'si', label: t('onboarding.siTitle') },
              ]}
            />
          </Stack>
          <Stack gap={2}>
            <Kicker>{t('eligibility.gender')}</Kicker>
            <SegmentedChips
              testID="eligibility-gender"
              tone="quiet"
              block
              value={gender}
              onChange={onGender}
              options={[
                { value: 'male', label: t('eligibility.male') },
                { value: 'female', label: t('eligibility.female') },
              ]}
            />
          </Stack>
          <Stack gap={2}>
            <Kicker>{t('eligibility.group')}</Kicker>
            <SegmentedChips
              testID="eligibility-group"
              tone="quiet"
              block
              value={group}
              onChange={onGroup}
              options={[
                { value: 'general', label: t('eligibility.general') },
                { value: 'st', label: t('eligibility.st') },
              ]}
            />
          </Stack>
          {!allVerified(standards) && (
            // Something on this table is not confirmed yet; say so where the reader is looking,
            // not only in the small print at the bottom.
            <Text testID="eligibility-unverified-note" variant="caption" color="dim">
              {t('eligibility.unverifiedNote')}
            </Text>
          )}
        </Stack>

        <Stack testID="eligibility-fields" gap={4} className="mt-6">
          <Kicker>{t('eligibility.measurements')}</Kicker>
          {entries.map(({ key, standard }) => field(key, standard))}
        </Stack>

        <Button
          testID="eligibility-check"
          size="lg"
          label={t('eligibility.check')}
          onPress={check}
          className="mt-6"
        />

        {result && (
          // `Animated.View` ignores `className`: it carries the motion and the layout
          // measurement, the styled block is the plain `Stack` inside.
          <Animated.View
            testID="eligibility-result"
            onLayout={onVerdictLayout}
            entering={m.fadeIn()}
            layout={m.reduced ? undefined : LinearTransition.duration(motion.base)}
          >
            <Stack gap={3} className="mt-6">
              <VerdictBanner result={result} labelOf={labelOf} />
              <Stack
                testID="eligibility-rows"
                className="rounded-md border border-line bg-panel2 px-3"
              >
                {result.rows.map((row, i) => (
                  <ResultRow
                    key={row.key}
                    row={row}
                    label={labelOf(row.key)}
                    unit={unitOf(row.key)}
                    last={i === result.rows.length - 1}
                  />
                ))}
              </Stack>
            </Stack>
          </Animated.View>
        )}

        <Text testID="eligibility-disclaimer" variant="caption" color="dim" className="mt-6">
          {t('eligibility.disclaimer', { year: iso(STANDARDS_NOTIFICATION_YEAR) })}
        </Text>
      </ScrollView>
    </Screen>
  );
}
