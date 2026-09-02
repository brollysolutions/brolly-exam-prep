import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { cx } from './cx';
import { Num } from './Num';
import { Row } from './Row';
import { Text } from './Text';

const LTR = { textAlign: 'left' } as const;

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
    <Row
      physical
      gap={2}
      testID={testID}
      accessible
      accessibilityLabel={t('auth.loginTitle')}
      accessibilityValue={{ text: filled ? value : (placeholder ?? t('auth.phoneHint')) }}
    >
      <View className="h-field w-prefix items-center justify-center rounded-sm border border-line">
        <Num variant="prefix" weight="600" color="dim">
          {prefix ?? t('auth.countryCode')}
        </Num>
      </View>
      {/* One a11y node per field: the label and the value live on the row above. */}
      <View
        className={cx(
          'h-field flex-1 justify-center rounded-sm border px-3',
          filled ? 'border-hivis' : 'border-line',
        )}
      >
        {/* A phone number reads left-to-right in every language, and so does its placeholder. */}
        {filled ? (
          <Num variant="field" weight="600" tracking="phone" style={LTR}>
            {value}
          </Num>
        ) : (
          <Text variant="bodyLg" weight="600" color="ghost" style={LTR}>
            {placeholder ?? t('auth.phoneHint')}
          </Text>
        )}
      </View>
    </Row>
  );
}
