import {
  colors,
  paletteState,
  radius,
  size as sizes,
  type PaletteState,
} from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import * as haptics from './haptics';
import { Num } from './Num';
import { pressedStyle, usePressed } from './pressable';

export type PaletteCellProps = Omit<PressableProps, 'style' | 'children'> & {
  n: number;
  state: PaletteState;
  /** The question on screen: 2 px ink ring with a 2 px canvas gap around the cell. */
  current?: boolean;
  /** Answered + marked: gold dot in a cream ring, top-end corner. */
  dot?: boolean;
  /** Layout override, e.g. the palette grid's computed column width. Merged over the defaults. */
  style?: StyleProp<ViewStyle>;
};

/**
 * 48 × 48 question cell in one of five states (nv / na / a / m / am):
 * plain = unvisited, red outline = not answered, gold = answered, ink = marked.
 */
export function PaletteCell({
  n,
  state,
  current = false,
  dot = false,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  ...rest
}: PaletteCellProps) {
  const d = useDir();
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed(onPressIn, onPressOut);
  const s = paletteState[state];
  // A transparent cell (not answered) has nothing to dim: it takes the `surface2` press fill
  // every outlined control uses (`pressedClass`); the filled cells dim like filled controls.
  const outlined = s.bg === 'transparent';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('test.qLabel')} ${n}`}
      accessibilityState={{ selected: current, disabled: !!disabled }}
      android_ripple={{ color: colors.accentTint }}
      {...rest}
      {...handlers}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress?.(e);
      }}
      className="items-center justify-center"
      // Size, fill and border are a flattened object, never a `style` callback: css-interop
      // cannot see inside a callback, so on web the cell rendered with no colours at all.
      style={StyleSheet.flatten([
        {
          width: sizes.cell,
          height: sizes.cell,
          borderRadius: radius.sm,
          backgroundColor: pressed && outlined ? colors.surface2 : s.bg,
          borderColor: s.border,
          borderWidth: s.borderWidth,
        },
        style,
        pressed && !outlined ? pressedStyle : null,
      ])}
    >
      <Num variant="cell" align="center" style={{ color: s.fg }}>
        {n}
      </Num>
      {current && (
        <View
          pointerEvents="none"
          testID="palette-current"
          className="absolute -inset-[4px] rounded-md border-2 border-ink"
        />
      )}
      {dot && (
        <View
          testID="palette-dot"
          className="absolute h-dot w-dot rounded-full border-1.5 border-surface bg-accent"
          style={{ top: 2, [d.end]: 2 }}
        />
      )}
    </Pressable>
  );
}
