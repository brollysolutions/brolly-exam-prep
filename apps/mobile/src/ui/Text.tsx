import {
  tracking as trackingTokens,
  typography,
  type ColorName,
  type FontWeight,
  type Lang,
  type TextName,
} from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import {
  Text as RNText,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';

import { cx } from './cx';

export type TextAlign = 'start' | 'center' | 'end';

export type TextProps = Omit<RNTextProps, 'style'> & {
  /** Type role from `tokens.text`; sets size + line-height for the current language. */
  variant?: TextName;
  weight?: FontWeight;
  /** Token colour name; rendered as `text-<name>`. */
  color?: ColorName;
  /** Reading-order alignment resolved through `useDir()`. Defaults to `start`. */
  align?: TextAlign;
  /** Letter-spacing token. Applied for English only — Telugu and Urdu always get 0. */
  tracking?: keyof typeof trackingTokens;
  /** Tabular figures. */
  numeric?: boolean;
  /** Render in another language's face (e.g. a Telugu label inside an English UI). */
  lang?: Lang;
  uppercase?: boolean;
  className?: string;
  style?: StyleProp<TextStyle>;
};

/** The only text primitive. Never set `fontFamily` or `fontSize` elsewhere. */
export function Text({
  variant = 'body',
  weight = '400',
  color = 'chalk',
  align = 'start',
  tracking,
  numeric,
  lang,
  uppercase,
  className,
  style,
  ...rest
}: TextProps) {
  const d = useDir();
  const face = lang ?? d.lang;
  const type = typography(face, variant, weight);
  const letterSpacing = tracking
    ? face === 'en'
      ? trackingTokens[tracking]
      : 0
    : type.letterSpacing;
  const textAlign =
    align === 'center' ? 'center' : align === 'end' ? d.pick('right', 'left') : d.textAlign;
  return (
    <RNText
      {...rest}
      className={cx(`text-${color}`, className)}
      style={[
        type,
        {
          letterSpacing,
          textAlign,
          writingDirection: face === 'ur' ? 'rtl' : 'ltr',
          fontVariant: numeric ? ['tabular-nums'] : undefined,
          textTransform: uppercase ? 'uppercase' : undefined,
        },
        style,
      ]}
    />
  );
}
