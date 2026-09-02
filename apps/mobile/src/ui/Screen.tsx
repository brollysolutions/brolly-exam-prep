import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cx } from './cx';
import { HazardRail } from './HazardRail';

export type ScreenProps = ViewProps & {
  /** Hazard rail on top. Default on. */
  rail?: boolean;
  /** Rail turns flag-red and marquees. */
  critical?: boolean;
  /** 16 px horizontal padding on the body. */
  padded?: boolean;
  /** Body becomes a ScrollView. */
  scroll?: boolean;
  /**
   * Absolute-fill layer rendered as a sibling *after* the body, outside any ScrollView.
   * Put `Dialog` (and top-anchored `Toast`s) here — inside a scrolling body an absolute-fill
   * overlay would size to the content, not the viewport. Touches pass through empty areas.
   */
  overlay?: ReactNode;
  children?: ReactNode;
};

/**
 * Safe-area container on `tar`. Every route renders inside one.
 * Body goes in `children`; modal surfaces (Dialog, Toast) go in `overlay`.
 */
export function Screen({
  rail = true,
  critical = false,
  padded = false,
  scroll = false,
  overlay,
  children,
  className,
  style,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      {...rest}
      className={cx('flex-1 bg-tar', className)}
      // Flattened on purpose: css-interop mutates array styles on web (see Text).
      style={StyleSheet.flatten([
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ])}
    >
      {rail && <HazardRail critical={critical} />}
      {scroll ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={cx('pb-6', padded && 'px-4')}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cx('flex-1', padded && 'px-4')}>{children}</View>
      )}
      {overlay !== undefined && overlay !== null && (
        <View pointerEvents="box-none" className="absolute inset-0">
          {overlay}
        </View>
      )}
    </View>
  );
}
