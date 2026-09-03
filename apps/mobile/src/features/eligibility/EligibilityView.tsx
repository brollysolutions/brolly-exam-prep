import { colors, size as sizes, typography, type ColorName } from '@tslprb/design-tokens';
import {
  standardEntries,
  standardsFor,
  type Gender,
  type Post,
  type StandardKey,
  type StandardsGroup,
} from '@tslprb/fixtures';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader } from '@/features/result/Header';
import { Button, cx, Glyph, Kicker, Measure, Row, Screen, SegmentedChips, Stack, Text } from '@/ui';

import type { EligibilityRow, Evaluation, MeasureValues, Verdict } from './evaluate';

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

/** `eligibility.*` key for each standard's name — the run rows read as events, not distances. */
const LABEL: Record<StandardKey, string> = {
  height: 'height',
  chest: 'chest',
  chestExpansion: 'chestExpansion',
  run1600m: 'run1600',
  run800m: 'run800',
  run100m: 'run100',
  longJump: 'longJump',
  shotPut: 'shotPut',
};

/**
 * Digits are typed in the Latin face in every language, like every other number in the app:
 * the standards are printed in Latin figures on the notification and on the measuring tape.
 */
const INPUT_STYLE = StyleSheet.flatten([
  typography('en', 'field', '600'),
  {
    color: colors.chalk,
    height: sizes.touchLg,
    padding: 0,
    textAlign: 'left' as const,
    textAlignVertical: 'center' as const,
    writingDirection: 'ltr' as const,
  },
]);

/** Longest sane entry is "167.6"; the cap stops a paste from turning a height into a novel. */
const MAX_DIGITS = 6;

function MeasureField({
  label,
  unit,
  value,
  onChange,
  testID,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  testID: string;
}) {
  // Focus lives in state rather than in a `style` callback: a callback next to `className`
  // loses its static values under css-interop on web (see `usePressed`).
  const [focused, setFocused] = useState(false);
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
      <View
        className={cx(
          'h-touchLg justify-center rounded-sm border bg-panel2 px-3',
          focused ? 'border-hivis' : 'border-line',
        )}
      >
        <TextInput
          testID={testID}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          maxLength={MAX_DIGITS}
          accessibilityLabel={`${label} (${unit})`}
          selectionColor={colors.hivis}
          placeholderTextColor={colors.ghost}
          style={INPUT_STYLE}
        />
      </View>
    </Stack>
  );
}

const rowTone = (pass: boolean | undefined): ColorName =>
  pass === true ? 'hivis' : pass === false ? 'flag' : 'dim';

const rowGlyph = (pass: boolean | undefined): string =>
  pass === true ? '✓' : pass === false ? '✕' : '·';

/**
 * Marks a figure seeded from secondary reporting. Dim rather than hazard: it is a caveat about
 * the table, not a fault in the candidate, and it must not compete with the ✓ / ✕ beside it.
 */
function UnverifiedTag({ testID }: { testID: string }) {
  const { t } = useTranslation();
  return (
    <View testID={testID} className="rounded-sm border border-line px-2">
      <Text variant="caption" color="dim">
        {t('eligibility.unverified')}
      </Text>
    </View>
  );
}

function ResultRow({ row, label, unit }: { row: EligibilityRow; label: string; unit: string }) {
  const { t } = useTranslation();
  const tone = rowTone(row.pass);
  const state =
    row.pass === true
      ? t('eligibility.pass')
      : row.pass === false
        ? t('eligibility.fail')
        : t('eligibility.notEntered');
  return (
    <Row testID={`eligibility-row-${row.key}`} gap={2} align="center" className="py-2">
      <Glyph variant="body" color={tone} accessibilityLabel={state}>
        {rowGlyph(row.pass)}
      </Glyph>
      <Stack gap={1} className="flex-1">
        <Row gap={2} align="center" wrap>
          <Text variant="body" weight="600">
            {label}
          </Text>
          {!row.verified && <UnverifiedTag testID={`eligibility-unverified-${row.key}`} />}
        </Row>
        <Row gap={2} align="baseline" wrap>
          <Text variant="caption" color="dim">
            {t('eligibility.required')}
          </Text>
          <Measure value={row.required} unit={unit} variant="caption" color="dim" />
          <Text variant="caption" color="dim">
            {t('eligibility.yours')}
          </Text>
          {row.actual === undefined ? (
            <Glyph variant="caption" color="dim">
              —
            </Glyph>
          ) : (
            <Measure
              testID={`eligibility-yours-${row.key}`}
              value={row.actual}
              unit={unit}
              variant="caption"
              color={tone}
            />
          )}
        </Row>
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
          <Kicker uppercase>{t('eligibility.improve')}</Kicker>
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
  /** Field text keyed by the standard it answers, exactly as typed. */
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
 * confirm is tagged on its row, and the SI post carries a note under the pickers.
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
  const standards = standardsFor(post, gender, group);
  const entries = standardEntries(standards);
  const labelOf = (key: StandardKey) => t(`eligibility.${LABEL[key]}`);
  const unitOf = (key: StandardKey) => t(`eligibility.${UNIT[key]}`);

  return (
    <Screen testID="eligibility-screen">
      <BackHeader testID="eligibility-header" title={t('eligibility.title')} onBack={onBack} />
      <ScrollView
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

        <Stack gap={4} className="mt-5">
          <Stack gap={2}>
            <Kicker uppercase>{t('eligibility.post')}</Kicker>
            <SegmentedChips
              testID="eligibility-post"
              value={post}
              onChange={onPost}
              options={[
                { value: 'pc', label: t('onboarding.pcTitle') },
                { value: 'si', label: t('onboarding.siTitle') },
              ]}
            />
          </Stack>
          <Stack gap={2}>
            <Kicker uppercase>{t('eligibility.gender')}</Kicker>
            <SegmentedChips
              testID="eligibility-gender"
              value={gender}
              onChange={onGender}
              options={[
                { value: 'male', label: t('eligibility.male') },
                { value: 'female', label: t('eligibility.female') },
              ]}
            />
          </Stack>
          <Stack gap={2}>
            <Kicker uppercase>{t('eligibility.group')}</Kicker>
            <SegmentedChips
              testID="eligibility-group"
              value={group}
              onChange={onGroup}
              options={[
                { value: 'general', label: t('eligibility.general') },
                { value: 'st', label: t('eligibility.st') },
              ]}
            />
          </Stack>
          {post === 'si' && (
            // Nothing on the SI rows is confirmed yet; say so where the reader is looking, not
            // only in the small print at the bottom.
            <Text testID="eligibility-si-note" variant="caption" color="dim">
              {t('eligibility.siUnverified')}
            </Text>
          )}
        </Stack>

        <Stack testID="eligibility-fields" gap={4} className="mt-6">
          {entries.map(({ key }) => (
            <MeasureField
              key={key}
              testID={`eligibility-field-${key}`}
              label={labelOf(key)}
              unit={unitOf(key)}
              value={values[key] ?? ''}
              onChange={(text) => onChange(key, text)}
            />
          ))}
        </Stack>

        <Button
          testID="eligibility-check"
          size="lg"
          label={t('eligibility.check')}
          onPress={onCheck}
          className="mt-6"
        />

        {result && (
          <Stack gap={3} className="mt-6">
            <VerdictBanner result={result} labelOf={labelOf} />
            <Stack
              testID="eligibility-rows"
              className="rounded-md border border-line bg-panel2 px-3 py-1"
            >
              {result.rows.map((row) => (
                <ResultRow
                  key={row.key}
                  row={row}
                  label={labelOf(row.key)}
                  unit={unitOf(row.key)}
                />
              ))}
            </Stack>
          </Stack>
        )}

        <Text testID="eligibility-disclaimer" variant="caption" color="dim" className="mt-6">
          {t('eligibility.disclaimer')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
