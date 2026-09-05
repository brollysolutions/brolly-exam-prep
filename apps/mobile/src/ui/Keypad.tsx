import { colors } from '@tslprb/design-tokens';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { cx } from './cx';
import { Glyph } from './Glyph';
import * as haptics from './haptics';
import { Num } from './Num';
import { pressedClass, usePressed } from './pressable';
import { Row } from './Row';
import { Stack } from './Stack';

export type KeypadProps = {
  onKey: (key: string) => void;
  onDelete: () => void;
  disabled?: boolean;
  testID?: string;
};

const DEL = 'del';
const ROWS: readonly (readonly string[])[] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', DEL],
];

/**
 * One key. Its own component so the press delta can live in state: a `style` callback next to
 * `className` loses its static values under css-interop on web (see `usePressed`).
 */
function Key({
  disabled,
  accessibilityLabel,
  onPress,
  children,
}: {
  disabled: boolean;
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { pressed, handlers } = usePressed();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      android_ripple={{ color: colors.accentTint }}
      onPress={onPress}
      {...handlers}
      // A surface key in the 3:1 outline on the cream canvas; pressed swaps the fill (one
      // `bg-*` class at a time).
      className={cx(
        'h-key flex-1 items-center justify-center rounded-sm border border-outline',
        pressed ? pressedClass : 'bg-surface',
      )}
    >
      {children}
    </Pressable>
  );
}

/** 3×4 numeric keypad. Digit order stays physical LTR in every language, like the OS dialer. */
export function Keypad({ onKey, onDelete, disabled = false, testID }: KeypadProps) {
  const { t } = useTranslation();
  return (
    <Stack gap={2} testID={testID}>
      {ROWS.map((row, r) => (
        <Row key={r} physical gap={2} testID={testID ? `${testID}-row-${r}` : undefined}>
          {row.map((k, c) =>
            k === '' ? (
              <View key={c} className="h-key flex-1" />
            ) : (
              <Key
                key={c}
                disabled={disabled}
                accessibilityLabel={k === DEL ? t('auth.deleteDigit') : k}
                onPress={() => {
                  haptics.tapLight();
                  if (k === DEL) onDelete();
                  else onKey(k);
                }}
              >
                {k === DEL ? (
                  <Glyph weight="600" align="center">
                    ⌫
                  </Glyph>
                ) : (
                  <Num variant="keypad" weight="600" align="center">
                    {k}
                  </Num>
                )}
              </Key>
            ),
          )}
        </Row>
      ))}
    </Stack>
  );
}
