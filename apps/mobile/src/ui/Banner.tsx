import { Ionicons } from '@expo/vector-icons';
import { colors } from '@tslprb/design-tokens';
import { useTranslation } from 'react-i18next';

import { Row } from './Row';
import { Text } from './Text';

export type BannerProps = {
  /** Defaults to the offline copy. */
  text?: string;
  testID?: string;
};

/**
 * The offline banner: the cloud-offline icon in `ink3` on a `surface2` strip under a hairline.
 * An icon that names the condition, in the caption's own grey, rather than a gold square that
 * said nothing (design review, F-28 fix wave 1, D13).
 */
const ICON_SIZE = 16;
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
      <Ionicons
        testID={testID ? `${testID}-icon` : undefined}
        name="cloud-offline-outline"
        size={ICON_SIZE}
        color={colors.ink3}
        accessibilityElementsHidden
        importantForAccessibility="no"
        // Sits on the caption's first line (18 px) rather than the strip's top edge.
        style={{ marginTop: 1 }}
      />
      <Text variant="caption" color="ink2" className="flex-1">
        {text ?? t('test.offline')}
      </Text>
    </Row>
  );
}
