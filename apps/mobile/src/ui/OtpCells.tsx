import { View } from 'react-native';

import { cx } from './cx';
import { Num } from './Num';
import { Row } from './Row';

export type OtpCellsProps = {
  value: string;
  length?: number;
  testID?: string;
};

/** Six equal surface cells; the next empty one carries the gold border. Always LTR — it is a number. */
export function OtpCells({ value, length = 6, testID }: OtpCellsProps) {
  const current = value.length;
  return (
    <Row physical gap={2} testID={testID} accessible accessibilityValue={{ text: value }}>
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          testID={testID ? `${testID}-${i}` : undefined}
          className={cx(
            'h-touch flex-1 items-center justify-center rounded-sm border bg-surface',
            i === current ? 'border-accentStrong' : 'border-line2',
          )}
        >
          <Num variant="otp" align="center">
            {value[i] ?? ''}
          </Num>
        </View>
      ))}
    </Row>
  );
}
