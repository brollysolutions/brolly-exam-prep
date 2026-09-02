import { spacing, type SpaceName } from '@tslprb/design-tokens';
import type { FlexAlignType, ViewStyle } from 'react-native';

/** Shared flex vocabulary for `Row` and `Stack`; values are spelled the Tailwind way. */
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

/** Spacing steps as numbers (`gap={2}` ⇒ 8 px) or `'px'`, mirroring Tailwind's `gap-2` / `gap-px`. */
export type SpaceStep = SpaceName extends infer K
  ? K extends `${infer N extends number}`
    ? N
    : K
  : never;

export const gapOf = (step: SpaceStep | undefined): number | undefined =>
  step === undefined ? undefined : spacing[String(step) as SpaceName];

export const alignItems: Record<Align, FlexAlignType> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

export const justifyContent: Record<Justify, NonNullable<ViewStyle['justifyContent']>> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};
