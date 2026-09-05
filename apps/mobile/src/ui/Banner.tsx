import { useTranslation } from 'react-i18next';

import { Glyph } from './Glyph';
import { Row } from './Row';
import { Text } from './Text';

export type BannerProps = {
  /** Defaults to the offline copy. */
  text?: string;
  testID?: string;
};

/** The offline banner: dark-gold square glyph on a `surface2` strip under a hairline. */
export function Banner({ text, testID }: BannerProps) {
  const { t } = useTranslation();
  return (
    <Row
      testID={testID}
      gap={2}
      align="start"
      accessibilityLiveRegion="polite"
      className="border-b border-line bg-surface2 px-3 py-2"
    >
      <Glyph
        variant="body"
        color="accentInk"
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        ■
      </Glyph>
      <Text variant="caption" color="ink2" className="flex-1">
        {text ?? t('test.offline')}
      </Text>
    </Row>
  );
}
