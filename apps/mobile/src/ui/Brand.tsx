import { colors } from '@tslprb/design-tokens';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Row } from './Row';
import { Text } from './Text';

/**
 * `lockup` = the header mark: the umbrella glyph beside live Playfair text. `splash` = the
 * full logo image, for the welcome screen and the splash.
 *
 * Live text in the header rather than the full PNG: the lockup is near-square, so at header
 * height the name would be six pixels tall.
 */
export type BrandVariant = 'lockup' | 'splash';

export type BrandProps = {
  variant?: BrandVariant;
  /** `lockup`: the umbrella's height (default 28). `splash`: the logo's width (default 200). */
  size?: number;
  testID?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/** The wordmark is a logo, not copy: it never translates. The accessible name comes from the locale. */
const WORD = 'Brolly';
const WORD_SUB = 'Solutions';

const UMBRELLA = require('../../assets/brand/umbrella.png');
const LOGO = require('../../assets/brand/splash-logo.png');
/** Pixel ratios of the two rasters (see `scripts/make-brand-assets.mjs`). */
const UMBRELLA_RATIO = 257 / 165;
const LOGO_RATIO = 541 / 428;

export function Brand({ variant = 'lockup', size, testID, className, style }: BrandProps) {
  const { t } = useTranslation();
  const name = t('common.brand');

  if (variant === 'splash') {
    const width = size ?? 200;
    // The role and name sit on the wrapper: ExpoImage forwards `accessibilityLabel` but not
    // the role, and one accessible node is what a screen reader should meet here.
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={name}
        className={className}
        style={style}
        testID={testID}
      >
        <Image
          source={LOGO}
          contentFit="contain"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID={testID ? `${testID}-logo` : undefined}
          style={{ width, height: Math.round(width / LOGO_RATIO) }}
        />
      </View>
    );
  }

  const height = size ?? 28;
  return (
    <Row
      accessible
      accessibilityRole="header"
      accessibilityLabel={name}
      align="center"
      gap={2}
      testID={testID}
      className={className}
      style={style}
    >
      <Image
        source={UMBRELLA}
        contentFit="contain"
        tintColor={colors.ink}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        testID={testID ? `${testID}-umbrella` : undefined}
        style={{ height, width: Math.round(height * UMBRELLA_RATIO) }}
      />
      {/* Baseline-aligned so the italic "Solutions" sits on the wordmark's line, as in the logo. */}
      <Row align="baseline" gap={1}>
        <Text variant="wordmark" lang="en" tracking="none" numberOfLines={1}>
          {WORD}
        </Text>
        <Text variant="wordmarkSub" lang="en" italic tracking="none" numberOfLines={1}>
          {WORD_SUB}
        </Text>
      </Row>
    </Row>
  );
}
