import { colors, size } from '@tslprb/design-tokens';
import { useTypography } from '@tslprb/i18n';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable } from 'react-native';

import { TabIcon, type TabIconName } from '@/features/shell/TabIcon';
import { haptics } from '@/ui';

/**
 * F-07 — the app shell.
 *
 * JS `Tabs`, not `NativeTabs`: the native bar draws itself with system materials (liquid glass
 * on iOS 26, Material You on Android) and cannot be made hi-vis-on-tar, which is the one thing
 * this app's chrome has to be. The bar below is identical on both platforms by design.
 */
const TABS: { name: 'index' | 'tests' | 'profile'; icon: TabIconName; labelKey: string }[] = [
  { name: 'index', icon: 'home', labelKey: 'tabs.home' },
  { name: 'tests', icon: 'tests', labelKey: 'tabs.tests' },
  { name: 'profile', icon: 'profile', labelKey: 'tabs.profile' },
];

export default function TabsLayout() {
  const { t } = useTranslation();
  // The label font has to follow the in-app language like every other string on screen.
  const label = useTypography('caption', '600');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.tar },
        tabBarActiveTintColor: colors.hivis,
        tabBarInactiveTintColor: colors.dim,
        tabBarStyle: {
          backgroundColor: colors.panel,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          // Elevation by a 1 px line, never a shadow.
          elevation: 0,
          height: size.touchLg + (Platform.OS === 'ios' ? 0 : 4),
        },
        tabBarItemStyle: { paddingVertical: 4 },
        // Tracking is Latin-only; the tab label follows the UI language's face.
        tabBarLabelStyle: { ...label, letterSpacing: 0 },
        // The stock button ripples plain white; this one carries the hi-vis tint and a
        // selection tick, like every other pressable in the app.
        tabBarButton: ({ children, style, onPress, ref: _ref, ...rest }) => (
          <Pressable
            {...rest}
            android_ripple={{ color: colors.hivisTint3, borderless: false }}
            onPress={(e) => {
              haptics.select();
              onPress?.(e);
            }}
            style={style}
          >
            {children}
          </Pressable>
        ),
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.labelKey),
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={tab.icon}
                color={color}
                focused={focused}
                testID={`tab-icon-${tab.name}`}
              />
            ),
            tabBarButtonTestID: `tab-${tab.name}`,
          }}
        />
      ))}
    </Tabs>
  );
}
