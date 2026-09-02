import { colors } from '@tslprb/design-tokens';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Glyph } from './Glyph';
import * as haptics from './haptics';
import { Num } from './Num';
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
              <Pressable
                key={c}
                accessibilityRole="button"
                accessibilityLabel={k === DEL ? t('auth.deleteDigit') : k}
                accessibilityState={{ disabled }}
                disabled={disabled}
                android_ripple={{ color: colors.hivisTint3 }}
                onPress={() => {
                  haptics.tapLight();
                  if (k === DEL) onDelete();
                  else onKey(k);
                }}
                className="h-key flex-1 items-center justify-center rounded-sm border border-line2 bg-panel4"
                style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
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
              </Pressable>
            ),
          )}
        </Row>
      ))}
    </Stack>
  );
}
