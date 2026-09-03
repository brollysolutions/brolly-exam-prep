import { render } from '@testing-library/react-native';
import { colors } from '@tslprb/design-tokens';
import { act, type ReactNode } from 'react';
import { initI18n, setLanguage, type Lang } from '@tslprb/i18n';

import TabsLayout from '@/app/(tabs)/_layout';

const BOTTOM_INSET = 34;

let options: Record<string, unknown> = {};
let mockScreens: { name: string; options: Record<string, unknown> }[] = [];

/**
 * `Tabs` needs a navigation container to render for real. The screen options are the whole
 * subject here, so the navigator is replaced with a probe that records them.
 */
jest.mock('expo-router/js-tabs', () => {
  function Tabs({
    screenOptions,
    children,
  }: {
    screenOptions: Record<string, unknown>;
    children?: ReactNode;
  }) {
    options = screenOptions;
    // The children ARE rendered, so each `Tabs.Screen` can record the tab it declares —
    // the bar's contents and its order are as much the subject here as its styling.
    return children;
  }
  function Screen({ name, options: o }: { name: string; options: Record<string, unknown> }) {
    mockScreens.push({ name, options: o });
    return null;
  }
  Tabs.Screen = Screen;
  return { Tabs };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: BOTTOM_INSET, left: 0, right: 0 }),
}));

const barStyle = () => options.tabBarStyle as { height: number; backgroundColor: string };
const itemStyle = () => options.tabBarItemStyle as { paddingBottom: number };

beforeAll(() => {
  initI18n('en');
});

beforeEach(() => {
  mockScreens = [];
});

afterAll(async () => {
  await act(async () => {
    await setLanguage('en');
  });
});

describe('the tabs themselves', () => {
  it('carries four tabs, with Study between Home and Tests', async () => {
    await render(<TabsLayout />);
    expect(mockScreens.map((s) => s.name)).toEqual(['index', 'study', 'tests', 'profile']);
    expect(mockScreens.map((s) => s.options.title)).toEqual(['Home', 'Study', 'Tests', 'Profile']);
  });

  it('gives every tab a testID and an icon', async () => {
    await render(<TabsLayout />);
    for (const s of mockScreens) {
      expect(s.options.tabBarButtonTestID).toBe(`tab-${s.name}`);
      expect(typeof s.options.tabBarIcon).toBe('function');
    }
  });
});

describe('tab bar', () => {
  it('sits on panel with a 1 px line and no shadow', async () => {
    await render(<TabsLayout />);
    expect(barStyle().backgroundColor).toBe(colors.panel);
    expect(options.tabBarActiveTintColor).toBe(colors.hivis);
    expect(options.tabBarInactiveTintColor).toBe(colors.dim);
    expect(options.tabBarStyle).toMatchObject({ borderTopWidth: 1, elevation: 0 });
  });

  // 56 px clipped the English labels by a pixel (design review, F-23-25): the label band
  // needs 62 before the inset is added.
  it('adds the bottom inset to its own height rather than sitting inside it', async () => {
    await render(<TabsLayout />);
    expect(barStyle().height).toBe(62 + BOTTOM_INSET);
    expect(itemStyle().paddingBottom).toBe(6 + BOTTOM_INSET);
  });

  it.each<[Lang, number]>([
    ['te', 68],
    ['ur', 76],
  ])('gives %s a taller bar so its labels are not clipped', async (lang, height) => {
    await act(async () => {
      await setLanguage(lang);
    });
    await render(<TabsLayout />);
    expect(barStyle().height).toBe(height + BOTTOM_INSET);
    // Tracking is Latin-only.
    expect(options.tabBarLabelStyle).toMatchObject({ letterSpacing: 0 });
  });
});
