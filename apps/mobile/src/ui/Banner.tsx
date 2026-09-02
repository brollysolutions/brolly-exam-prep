import { useTranslation } from 'react-i18next';

import { Row } from './Row';
import { Text } from './Text';

export type BannerProps = {
  /** Defaults to the offline copy. */
  text?: string;
  testID?: string;
};

/** The offline banner: sand square glyph on the dim gold surface. */
export function Banner({ text, testID }: BannerProps) {
  const { t } = useTranslation();
  return (
    <Row
      testID={testID}
      gap={2}
      align="start"
      accessibilityLiveRegion="polite"
      className="border-b border-offlineLine bg-offlineBg px-3 py-2"
    >
      <Text variant="body" color="sand" accessibilityElementsHidden importantForAccessibility="no">
        ■
      </Text>
      <Text variant="caption" color="offlineText" className="flex-1">
        {text ?? t('test.offline')}
      </Text>
    </Row>
  );
}
