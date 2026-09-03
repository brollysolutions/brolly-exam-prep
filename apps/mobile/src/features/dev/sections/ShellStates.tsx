import { EXAM_INFO, latestAffairs, latestNotices } from '@tslprb/fixtures';
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { useLangStore } from '@/data/lang';
import { HomeView } from '@/features/home/HomeView';
import { LibraryView } from '@/features/library/LibraryView';
import { WelcomeView } from '@/features/onboarding/WelcomeView';
import { ProfileView } from '@/features/profile/ProfileView';
import { Kicker, Stack, Text } from '@/ui';

/** Developer-only gallery labels — not product copy, so deliberately outside the locale files. */
const DEV = {
  shell: 'App shell (F-02 / F-07 / F-08 / F-14)',
  welcome: 'WelcomeView — slide 1 of 3',
  home: 'HomeView — signed in, half the day done (F-23)',
  homeGuest: 'HomeView — guest, nothing sat yet (F-23)',
  homeExamDay: 'HomeView — exam day, no countdown number (F-23)',
  homeHeld: 'HomeView — PWT held, nothing from the Board yet: empty shelves hidden (F-23)',
  library: 'LibraryView — full mocks',
  profile: 'ProfileView — reminders on',
  profileGuest: 'ProfileView — guest, account section offers a sign-in (F-19)',
} as const;

/**
 * One preview per screen, not one per state: each screen carries its own state matrix in
 * `features/<area>/__tests__`, and every preview here costs the gallery's Urdu snapshot a
 * full screen tree.
 */

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

/** The same three-item head of each shelf the Home route draws. */
const SHELF_NOTICES = latestNotices(3);
const SHELF_AFFAIRS = latestAffairs(3);

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

      <Preview label={DEV.welcome}>
        <WelcomeView onDone={noop} />
      </Preview>
      <Preview label={DEV.home}>
        <HomeView
          name="…1234"
          signedIn
          lang={lang}
          onLang={setLang}
          daysToExam={45}
          examDate="18-10-2026"
          examLabel={EXAM_INFO.label[lang]}
          streakDays={4}
          today={{ done: 12, target: 20 }}
          notices={SHELF_NOTICES}
          affairs={SHELF_AFFAIRS}
          progress={{ topicsRead: 5, topicsTotal: 11, papers: 3, bestPct: 62 }}
          onSignIn={noop}
          onOpenUpdates={noop}
          onOpenNotice={noop}
          onOpenPhysical={noop}
          onOpenAffairs={noop}
        />
      </Preview>
      <Preview label={DEV.homeGuest}>
        <HomeView
          signedIn={false}
          lang={lang}
          onLang={setLang}
          daysToExam={45}
          examDate="18-10-2026"
          examLabel={EXAM_INFO.label[lang]}
          streakDays={0}
          today={{ done: 0, target: 20 }}
          notices={SHELF_NOTICES}
          affairs={SHELF_AFFAIRS}
          progress={{ topicsRead: 0, topicsTotal: 11, papers: 0 }}
          onSignIn={noop}
          onOpenUpdates={noop}
          onOpenNotice={noop}
          onOpenPhysical={noop}
          onOpenAffairs={noop}
        />
      </Preview>
      <Preview label={DEV.homeExamDay}>
        <HomeView
          name="…1234"
          signedIn
          lang={lang}
          onLang={setLang}
          daysToExam={0}
          examDate="18-10-2026"
          examLabel={EXAM_INFO.label[lang]}
          streakDays={12}
          today={{ done: 0, target: 20 }}
          notices={SHELF_NOTICES}
          affairs={SHELF_AFFAIRS}
          progress={{ topicsRead: 11, topicsTotal: 11, papers: 9, bestPct: 78 }}
          onSignIn={noop}
          onOpenUpdates={noop}
          onOpenNotice={noop}
          onOpenPhysical={noop}
          onOpenAffairs={noop}
        />
      </Preview>
      <Preview label={DEV.homeHeld}>
        <HomeView
          name="…1234"
          signedIn
          lang={lang}
          onLang={setLang}
          daysToExam={-3}
          examDate="18-10-2026"
          examLabel={EXAM_INFO.label[lang]}
          streakDays={0}
          today={{ done: 0, target: 20 }}
          notices={[]}
          affairs={[]}
          progress={{ topicsRead: 11, topicsTotal: 11, papers: 9, bestPct: 78 }}
          onSignIn={noop}
          onOpenUpdates={noop}
          onOpenNotice={noop}
          onOpenPhysical={noop}
          onOpenAffairs={noop}
        />
      </Preview>
      <Preview label={DEV.library}>
        <LibraryView lang={lang} onOpen={noop} onLocked={noop} />
      </Preview>
      <Preview label={DEV.profile}>
        <ProfileView
          post="si"
          category="bc"
          signedIn
          lang={lang}
          notifications
          version="1.0.0"
          onLang={setLang}
          onNotifications={noop}
          onSignIn={noop}
          onEditPost={noop}
          onEditCategory={noop}
          onLogout={noop}
          onDelete={noop}
        />
      </Preview>
      <Preview label={DEV.profileGuest}>
        <ProfileView
          signedIn={false}
          lang={lang}
          notifications
          version="1.0.0"
          onLang={setLang}
          onNotifications={noop}
          onSignIn={noop}
          onEditPost={noop}
          onEditCategory={noop}
          onLogout={noop}
          onDelete={noop}
        />
      </Preview>
    </Stack>
  );
}
