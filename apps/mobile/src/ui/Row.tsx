import { useDir } from '@tslprb/i18n';
import { StyleSheet, View, type ViewProps } from 'react-native';

import {
  alignItems,
  gapOf,
  justifyContent,
  type Align,
  type Justify,
  type SpaceStep,
} from './layoutProps';

export type RowProps = ViewProps & {
  /** Keep physical left-to-right order even under RTL (numbers: keypad, OTP, phone). */
  physical?: boolean;
  gap?: SpaceStep;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
};

/** Horizontal flex that follows the in-app reading direction via `useDir().row`. */
export function Row({ physical = false, gap, align, justify, wrap, style, ...rest }: RowProps) {
  const d = useDir();
  return (
    <View
      {...rest}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([
        {
          flexDirection: physical ? 'row' : d.row,
          gap: gapOf(gap),
          alignItems: align && alignItems[align],
          justifyContent: justify && justifyContent[justify],
          flexWrap: wrap ? 'wrap' : undefined,
        },
        style,
      ])}
    />
  );
}
