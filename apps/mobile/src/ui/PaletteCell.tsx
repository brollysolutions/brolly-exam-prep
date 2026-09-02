import { colors, paletteState, type PaletteState } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { useTranslation } from 'react-i18next';
import { Pressable, View, type PressableProps } from 'react-native';

import * as haptics from './haptics';
import { Num } from './Num';

export type PaletteCellProps = Omit<PressableProps, 'style' | 'children'> & {
  n: number;
  state: PaletteState;
  /** The question on screen: 2 px chalk outline, 2 px outside the cell. */
  current?: boolean;
  /** Answered + marked: hi-vis dot in the top-end corner. */
  dot?: boolean;
};

/** 48 × 48 question cell in one of five states (nv / na / a / m / am). */
export function PaletteCell({
  n,
  state,
  current = false,
  dot = false,
  onPress,
  disabled,
  ...rest
}: PaletteCellProps) {
  const d = useDir();
  const { t } = useTranslation();
  const s = paletteState[state];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('test.qLabel')} ${n}`}
      accessibilityState={{ selected: current, disabled: !!disabled }}
      android_ripple={{ color: colors.hivisTint3 }}
      {...rest}
      disabled={disabled}
      onPress={(e) => {
        haptics.select();
        onPress?.(e);
      }}
      className="h-touch w-touch items-center justify-center rounded-sm"
      style={({ pressed }) => [
        { backgroundColor: s.bg, borderColor: s.border, borderWidth: s.borderWidth },
        pressed ? { opacity: 0.85 } : null,
      ]}
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
