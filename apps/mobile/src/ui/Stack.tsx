import { StyleSheet, View, type ViewProps } from 'react-native';

import {
  alignItems,
  gapOf,
  justifyContent,
  type Align,
  type Justify,
  type SpaceStep,
} from './layoutProps';

export type StackProps = ViewProps & {
  gap?: SpaceStep;
  align?: Align;
  justify?: Justify;
};

/** Vertical flex with a token gap. Direction-neutral: columns do not mirror. */
export function Stack({ gap, align, justify, style, ...rest }: StackProps) {
  return (
    <View
      {...rest}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([
        {
          flexDirection: 'column',
          gap: gapOf(gap),
          alignItems: align && alignItems[align],
          justifyContent: justify && justifyContent[justify],
        },
        style,
      ])}
    />
  );
}
