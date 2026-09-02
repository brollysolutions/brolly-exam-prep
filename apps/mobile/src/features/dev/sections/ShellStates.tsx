import { colors } from '@tslprb/design-tokens';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { HomeView } from '@/features/home/HomeView';
import { LibraryView } from '@/features/library/LibraryView';
import { WelcomeView } from '@/features/onboarding/WelcomeView';
import { ProfileView } from '@/features/profile/ProfileView';
import { TabIcon, type TabIconName } from '@/features/shell/TabIcon';
import { Kicker, Row, Stack, Text } from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  shell: 'App shell (F-02 / F-07 / F-08 / F-14)',
  tabIcons: 'Tab icons — inactive (dim) / active (hi-vis)',
  welcome: 'WelcomeView — slide 1 of 3',
  home: 'HomeView — signed in, 45 days out',
  library: 'LibraryView — full mocks',
  profile: 'ProfileView — reminders on',
} as const;

/**
 * One preview per screen, not one per state: each screen carries its own state matrix in
 * `features/<area>/__tests__`, and every preview here costs the gallery's Urdu snapshot a
 * full screen tree.
 */

const ICONS: TabIconName[] = ['home', 'tests', 'profile'];

/** Dev frame: every screen is `flex-1`, so a preview inside a scroll needs a bounded height. */
const PREVIEW_H = 560;

function Preview({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text variant="caption" color="dim">
        {label}
      </Text>
      <View className="overflow-hidden rounded-md border border-line" style={{ height: PREVIEW_H }}>
        {children}
      </View>
    </Stack>
  );
}

const noop = () => {};

/**
 * The four screens the prototype never drew, in the states worth eyeballing.
 * Lives in its own file so the four shell features can land without fighting over
 * `StatesView.tsx`.
 */
export function ShellStates({ index }: { index: string }) {
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);

  return (
    <Stack gap={3} className="mt-6">
      <Kicker index={index} color="dim" uppercase>
        {DEV.shell}
      </Kicker>

      <Text variant="caption" color="dim">
        {DEV.tabIcons}
      </Text>
      <Row gap={4} align="center" className="border border-line bg-panel p-3">
        {ICONS.map((name) => (
          <Row key={name} gap={2} align="center">
            <TabIcon name={name} color={colors.dim} />
            <TabIcon name={name} color={colors.hivis} focused />
          </Row>
        ))}
      </Row>

      <Preview label={DEV.welcome}>
        <WelcomeView onDone={noop} />
      </Preview>
      <Preview label={DEV.home}>
        <HomeView
          name="…1234"
          lang={lang}
          onLang={setLang}
          daysToExam={45}
          streakDays={4}
          onStartMock={noop}
          onWeakTopic={noop}
        />
      </Preview>
      <Preview label={DEV.library}>
        <LibraryView onOpen={noop} onLocked={noop} />
      </Preview>
      <Preview label={DEV.profile}>
        <ProfileView
          post="si"
          category="bc"
          lang={lang}
          notifications
          version="1.0.0"
          onLang={setLang}
          onNotifications={noop}
          onEditPost={noop}
          onEditCategory={noop}
          onLogout={noop}
          onDelete={noop}
        />
      </Preview>
    </Stack>
  );
}
