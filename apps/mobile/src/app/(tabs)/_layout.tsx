import { Ionicons } from '@expo/vector-icons';
import { colors, size } from '@tslprb/design-tokens';
import { useLang, useTypography } from '@tslprb/i18n';
import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '@/ui';

/**
 * F-07 — the app shell.
 *
 * JS `Tabs`, not `NativeTabs`: the native bar draws itself with system materials (liquid glass
 * on iOS 26, Material You on Android) and cannot be made hi-vis-on-tar, which is the one thing
 * this app's chrome has to be. The bar below is identical on both platforms by design.
 */
const TABS = [
  { name: 'index', icon: 'home', labelKey: 'tabs.home' },
  { name: 'tests', icon: 'list', labelKey: 'tabs.tests' },
  { name: 'profile', icon: 'person', labelKey: 'tabs.profile' },
] as const;

/**
 * Bar height by language, before the safe-area inset is added.
 *
 * Telugu sits taller than Latin at the same point size and Nastaliq taller again — its
 * line-height is 2.05 — so a bar sized for English clips their labels (design review round 1).
 */
const BAR_HEIGHT = { en: size.touchLg, te: 68, ur: 76 } as const;

export default function TabsLayout() {
  const { t } = useTranslation();
  const lang = useLang();
  const insets = useSafeAreaInsets();
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
          // The bar owns the bottom inset; `Screen bottomInset={false}` keeps the scenes from
          // padding for it a second time.
          height: BAR_HEIGHT[lang] + insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 6, paddingBottom: 6 + insets.bottom },
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
              <Ionicons
                name={focused ? tab.icon : `${tab.icon}-outline`}
                size={22}
                color={color}
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
