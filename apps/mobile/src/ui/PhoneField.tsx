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

/** Login field row: the +91 box and the value box (surface, 3:1 outline, gold once filled), fed by `Keypad`. LTR in every language. */
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
      <View
        testID={testID ? `${testID}-prefix` : undefined}
        className="h-field w-prefix items-center justify-center rounded-sm border border-outline bg-surface"
      >
        <Num variant="prefix" weight="600" color="ink3">
          {prefix ?? t('auth.countryCode')}
        </Num>
      </View>
      {/* One a11y node per field: the label and the value live on the row above. */}
      <View
        testID={testID ? `${testID}-value` : undefined}
        className={cx(
          'h-field flex-1 justify-center rounded-sm border bg-surface px-3',
          filled ? 'border-accentStrong' : 'border-outline',
        )}
      >
        {/* A phone number reads left-to-right in every language, and so does its placeholder. */}
        {filled ? (
          <Num variant="field" weight="600" tracking="phone" style={LTR}>
            {value}
          </Num>
        ) : (
          <Text variant="bodyLg" weight="600" color="ink3" style={LTR}>
            {placeholder ?? t('auth.phoneHint')}
          </Text>
        )}
      </View>
    </Row>
  );
}
