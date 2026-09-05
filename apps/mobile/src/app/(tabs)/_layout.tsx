import { Ionicons } from '@expo/vector-icons';
import { colors } from '@tslprb/design-tokens';
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
 * on iOS 26, Material You on Android) and cannot be made Brolly-on-cream, which is the one thing
 * this app's chrome has to be. The bar below is identical on both platforms by design.
 */
const TABS = [
  { name: 'index', icon: 'home', labelKey: 'tabs.home' },
  // Study sits next to Home, before Tests: reading comes before sitting a paper, and it is the
  // one tab a guest can use end to end.
  { name: 'study', icon: 'book', labelKey: 'tabs.study' },
  { name: 'tests', icon: 'list', labelKey: 'tabs.tests' },
  { name: 'profile', icon: 'person', labelKey: 'tabs.profile' },
] as const;

/**
 * Bar height by language, before the safe-area inset is added.
 *
 * The bar has to hold the label's own line (below) or the tab button flex-shrinks the label
 * and its single-line overflow clips the descenders — measured on the web export: the icon
 * wrapper is 28, React Navigation pads the button 5 each side, the item 6 each side, so a
 * 16 px Latin line needs 66 and a 19 px Telugu line 69; both get 2–3 px of slack (design
 * review, F-28 fix wave 1, D1 — 62 left the label 11 px and cut "Study").
 */
const BAR_HEIGHT = { en: 68, te: 72 } as const;

/**
 * The label's own line, not the body line-height: at 1.5 / 1.65 the caption's line box
 * outgrew the slot React Navigation gives it and "Study" lost its descender (design review,
 * F-28 fix wave 1, D1). 16 clears Inter's descender at 12 px; Telugu's stacked marks need 19.
 */
const LABEL_LINE_HEIGHT = { en: 16, te: 19 } as const;

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
        sceneStyle: { backgroundColor: colors.canvas },
        // Gold text is the 700 shade only (4.6:1); inactive labels are ink3 (5.0:1).
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.ink3,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          // Elevation by a 1 px line, never a shadow.
          elevation: 0,
          // The bar owns the bottom inset; `Screen bottomInset={false}` keeps the scenes from
          // padding for it a second time.
          height: BAR_HEIGHT[lang] + insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 6, paddingBottom: 6 + insets.bottom },
        // Tracking is Latin-only; the tab label follows the UI language's face on its own line.
        tabBarLabelStyle: {
          fontFamily: label.fontFamily,
          fontSize: label.fontSize,
          lineHeight: LABEL_LINE_HEIGHT[lang],
          letterSpacing: 0,
        },
        // The stock button ripples plain white; this one carries the gold tint and a
        // selection tick, like every other pressable in the app.
        tabBarButton: ({ children, style, onPress, ref: _ref, ...rest }) => (
          <Pressable
            {...rest}
            android_ripple={{ color: colors.accentTint, borderless: false }}
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
