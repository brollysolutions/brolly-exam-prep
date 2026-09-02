import {
  paletteState,
  radius,
  size,
  spacing,
  type PaletteState,
} from '@tslprb/design-tokens';
import { forwardRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, type LayoutChangeEvent } from 'react-native';

import type { AttemptState } from '@/data/attempt';
import {
  cellState,
  counts,
  isSectionLocked,
  sectionRange,
  totalQuestions,
} from '@/data/attempt.selectors';
import {
  Button,
  Num,
  PaletteCell,
  Row,
  Sheet,
  Stack,
  Text,
  type SheetHandle,
} from '@/ui';

/** The prototype's sheet height. */
const SNAP = ['82%'];
/** A locked group stays legible but visibly out of reach. */
const LOCKED_OPACITY = 0.38;
/** The prototype's grid: six equal columns, whatever the screen width. */
const COLUMNS = 6;
const GRID_GAP = spacing['2'];

export type PaletteSheetProps = {
  attempt: AttemptState;
  /** A cell tap: jump to that question (the caller closes the sheet). */
  onGoto: (n: number) => void;
  onSubmit: () => void;
  onClose?: () => void;
};

/** Answered *and* marked — the legend's fifth row, which `counts()` folds into the other two. */
function bothCount(attempt: AttemptState): number {
  let both = 0;
  for (let n = 1; n <= totalQuestions(attempt); n += 1)
    if (attempt.answers[n] !== undefined && attempt.marked[n] === true) both += 1;
  return both;
}

function Swatch({ state }: { state: PaletteState }) {
  const s = paletteState[state];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        width: size.swatch,
        height: size.swatch,
        borderRadius: radius.xs,
        backgroundColor: s.bg,
        borderColor: s.border,
        borderWidth: s.borderWidth,
      }}
    />
  );
}

/**
 * The question palette: legend counts over a per-section grid of 48 px cells.
 * `ref` is the `Sheet` handle, so the screen keeps `present()` / `dismiss()`.
 */
export const PaletteSheet = forwardRef<SheetHandle, PaletteSheetProps>(function PaletteSheet(
  { attempt, onGoto, onSubmit, onClose },
  ref,
) {
  const { t } = useTranslation();
  const tally = counts(attempt);
  const pattern = attempt.pattern;
  // Measured once per layout so the six columns divide the sheet evenly instead of wrapping
  // at the cell's intrinsic 48 px and leaving a ragged right edge on wider phones.
  const [gridWidth, setGridWidth] = useState(0);
  const onGridLayout = (e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width);
  const columnWidth =
    gridWidth > 0 ? (gridWidth - GRID_GAP * (COLUMNS - 1)) / COLUMNS : undefined;

  const legend: { state: PaletteState; label: string; count: number }[] = [
    { state: 'a', label: t('test.answered'), count: tally.answered },
    { state: 'na', label: t('test.notAnswered'), count: tally.notAnswered },
    { state: 'm', label: t('test.marked'), count: tally.marked },
    { state: 'nv', label: t('test.notVisited'), count: tally.notVisited },
    { state: 'am', label: t('test.both'), count: bothCount(attempt) },
  ];

  const footer = (
    <View className="border-t border-line2 px-3 pb-3 pt-2">
      <Button size="lg" label={t('test.submit')} onPress={onSubmit} testID="palette-submit" />
    </View>
  );

  return (
    <Sheet
      ref={ref}
      title={t('test.palette')}
      snapPoints={SNAP}
      scroll
      footer={footer}
      onClose={onClose}
    >
      <View className="px-3 pb-2" testID="palette-legend">
        <Row wrap gap={3} align="center">
          {legend.map((l) => (
            <Row key={l.state} gap={2} align="center">
              <Swatch state={l.state} />
              <Text variant="small" color="dim">
                {l.label}
              </Text>
              <Num variant="small" color="chalk" testID={`legend-${l.state}`}>
                {l.count}
              </Num>
            </Row>
          ))}
        </Row>
      </View>

      <Stack className="px-3 pb-3" testID="palette-groups">
        {pattern?.sections.map((section, i) => {
          const { first } = sectionRange(pattern, i);
          const locked = isSectionLocked(attempt, i);
          const numbers = Array.from({ length: section.questions }, (_, k) => first + k);
          const done = numbers.filter((n) => attempt.answers[n] !== undefined).length;
          return (
            <View
              key={section.id}
              testID={`palette-group-${i}`}
              pointerEvents={locked ? 'none' : 'auto'}
              style={locked ? { opacity: LOCKED_OPACITY } : undefined}
            >
              <Row gap={2} align="center" className="mb-2 mt-3">
                <Text
                  variant="kicker"
                  weight="700"
                  color="dim"
                  tracking="kickerTight"
                  uppercase
                >
                  {t(section.labelKey)}
                </Text>
                <View className="h-px flex-1 bg-line2" />
                <Num variant="kicker" weight="400" color="dim">
                  {`${done}/${section.questions}`}
                </Num>
              </Row>
              <Row wrap gap={2} onLayout={onGridLayout}>
                {numbers.map((n) => {
                  const state = cellState(attempt, n);
                  return (
                    <PaletteCell
                      key={n}
                      n={n}
                      state={state}
                      current={n === attempt.current}
                      dot={state === 'am'}
                      disabled={locked}
                      onPress={() => onGoto(n)}
                      style={columnWidth === undefined ? undefined : { width: columnWidth }}
                      testID={`palette-cell-${n}`}
                    />
                  );
                })}
              </Row>
            </View>
          );
        })}
      </Stack>
    </Sheet>
  );
});
