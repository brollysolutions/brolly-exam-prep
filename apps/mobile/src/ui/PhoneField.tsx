import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { cx } from './cx';
import { Num } from './Num';
import { Row } from './Row';
import { Text } from './Text';

export type PhoneFieldProps = {
  value: string;
  placeholder?: string;
  prefix?: string;
  testID?: string;
};

/** Login field row: the +91 box and the value box, fed by `Keypad`. LTR in every language. */
export function PhoneField({ value, placeholder, prefix, testID }: PhoneFieldProps) {
  const { t } = useTranslation();
  const filled = value.length > 0;
  return (
    <Row reverse gap={2} testID={testID}>
      <View className="h-field w-prefix items-center justify-center rounded-sm border border-line">
        <Num variant="prefix" weight="600" color="dim">
          {prefix ?? t('auth.countryCode')}
        </Num>
      </View>
      <View
        accessible
        accessibilityLabel={t('auth.loginTitle')}
        accessibilityValue={{ text: filled ? value : (placeholder ?? t('auth.phoneHint')) }}
        className={cx(
          'h-field flex-1 justify-center rounded-sm border px-3',
          filled ? 'border-hivis' : 'border-line',
        )}
      >
        {filled ? (
          <Num variant="field" weight="600" tracking="phone">
            {value}
          </Num>
        ) : (
          <Text variant="bodyLg" weight="600" color="ghost">
            {placeholder ?? t('auth.phoneHint')}
          </Text>
        )}
      </View>
    </Row>
  );
}
