import {
  paletteState,
  radius,
  size,
  spacing,
  type PaletteState,
} from '@tslprb/design-tokens';
import { forwardRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';

import type { AttemptState } from '@/data/attempt';
import {
  cellState,
  counts,
  isSectionLocked,
  sectionRange,
  totalQuestions,
} from '@/data/attempt.selectors';
import {
  ActionBar,
  Button,
  Num,
  PaletteCell,
  Pill,
  Row,
  Sheet,
  Stack,
  Text,
  type SheetHandle,
} from '@/ui';

/** The prototype's sheet height, as a fraction of the window. */
const SHEET_FRACTION = 0.82;

/**
 * The sheet's height in pixels.
 *
 * The prototype specifies 82 % of the screen, and this used to be handed to
 * `@gorhom/bottom-sheet` as the string `'82%'`. A percentage snap point is resolved against a
 * container height the library's web provider never supplies, so `present()` set the state and
 * nothing mounted: the question palette did not exist in the browser build at all — no cells,
 * no legend, no `[aria-modal]` — from the day it was written until fix wave 1 (D13). Measuring
 * the window ourselves gives the same 82 % on every platform and mounts on all of them.
 */
export const paletteSheetHeight = (windowHeight: number): number =>
  Math.round(windowHeight * SHEET_FRACTION);
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
  const { height } = useWindowDimensions();
  // Measured, not `'82%'`: see `paletteSheetHeight`.
  const snapPoints = useMemo(() => [paletteSheetHeight(height)], [height]);
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

  // P5: the sheet's decision sits in the same bar every other screen puts one in, and the bar
  // owns the bottom inset — the sheet's own footer runs to the screen edge.
  const footer = (
    <ActionBar
      testID="palette-actions"
      primary={
        <Button size="lg" label={t('test.submit')} onPress={onSubmit} testID="palette-submit" />
      }
    />
  );

  return (
    <Sheet
      ref={ref}
      title={t('test.palette')}
      snapPoints={snapPoints}
      scroll
      footer={footer}
      onClose={onClose}
    >
      <View className="px-3 pb-2" testID="palette-legend">
        <Row wrap gap={3} align="center">
          {legend.map((l) => (
            <Row key={l.state} gap={2} align="center">
              <Swatch state={l.state} />
              <Text variant="small" color="ink3">
                {l.label}
              </Text>
              <Num variant="small" color="ink" testID={`legend-${l.state}`}>
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
              {/* A block head is a `Pill`, not a 10.5 px kicker: `ink3` at that ratio never
                  goes below the caption size (F-30 fix wave, A2). */}
              <Row gap={2} align="center" className="mb-2 mt-3">
                <Pill testID={`palette-section-${i}`} label={t(section.labelKey)} />
                <View className="h-px flex-1 bg-line" />
                <Num variant="caption" weight="600" color="ink3">
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
