import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

/**
 * Numbers, timers, phone numbers and scores are always LTR and tabular, in any language.
 * Wraps content in Unicode LRI…PDI isolation so it never re-orders inside RTL sentences.
 */
export function Num({ children, style, ...rest }: TextProps & { children: ReactNode }) {
  return (
    <Text
      {...rest}
      style={[{ writingDirection: 'ltr', fontVariant: ['tabular-nums'] }, style]}
      accessibilityLanguage="en"
    >
      {'⁦'}
      {children}
      {'⁩'}
    </Text>
  );
}
