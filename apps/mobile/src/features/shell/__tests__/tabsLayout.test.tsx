import { render } from '@testing-library/react-native';
import { colors, size } from '@tslprb/design-tokens';
import { act } from 'react';
import { initI18n, setLanguage, type Lang } from '@tslprb/i18n';

import TabsLayout from '@/app/(tabs)/_layout';

const BOTTOM_INSET = 34;

let options: Record<string, unknown> = {};

/**
 * `Tabs` needs a navigation container to render for real. The screen options are the whole
 * subject here, so the navigator is replaced with a probe that records them.
 */
jest.mock('expo-router/js-tabs', () => {
  function Tabs({ screenOptions }: { screenOptions: Record<string, unknown> }) {
    options = screenOptions;
    return null;
  }
  function Screen() {
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

afterAll(async () => {
  await act(async () => {
    await setLanguage('en');
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

  it('adds the bottom inset to its own height rather than sitting inside it', async () => {
    await render(<TabsLayout />);
    expect(barStyle().height).toBe(size.touchLg + BOTTOM_INSET);
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
