import type { ReactNode } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
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
  children?: ReactNode;
};

/** Safe-area container on `tar`. Every route renders inside one. */
export function Screen({
  rail = true,
  critical = false,
  padded = false,
  scroll = false,
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
      style={[
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
        style,
      ]}
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
    </View>
  );
}
