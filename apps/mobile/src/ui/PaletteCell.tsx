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
import { usePressed } from './pressable';
import { Num } from './Num';

export type PaletteCellProps = Omit<PressableProps, 'style' | 'children'> & {
  n: number;
  state: PaletteState;
  /** The question on screen: 2 px chalk outline, 2 px outside the cell. */
  current?: boolean;
  /** Answered + marked: hi-vis dot in the top-end corner. */
  dot?: boolean;
  /** Layout override, e.g. the palette grid's computed column width. Merged over the defaults. */
  style?: StyleProp<ViewStyle>;
};

/** 48 × 48 question cell in one of five states (nv / na / a / m / am). */
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('test.qLabel')} ${n}`}
      accessibilityState={{ selected: current, disabled: !!disabled }}
      android_ripple={{ color: colors.hivisTint3 }}
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
          backgroundColor: s.bg,
          borderColor: s.border,
          borderWidth: s.borderWidth,
        },
        style,
        pressed ? { opacity: 0.85 } : null,
      ])}
    >
      <Num variant="cell" align="center" style={{ color: s.fg }}>
        {n}
      </Num>
      {current && (
        <View
          pointerEvents="none"
          testID="palette-current"
          className="absolute -inset-[2px] rounded-md border-2 border-chalk"
        />
      )}
      {dot && (
        <View
          testID="palette-dot"
          className="absolute h-dot w-dot rounded-full border-1.5 border-panel2 bg-hivis"
          style={{ top: 2, [d.end]: 2 }}
        />
      )}
    </Pressable>
  );
}
