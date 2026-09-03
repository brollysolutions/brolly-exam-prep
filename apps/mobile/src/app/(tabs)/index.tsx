import { useRouter, type Href } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { HomeView, NEXT_MOCK } from '@/features/home/HomeView';

/** Fixture values until the API serves a notified exam date and a real practice streak. */
const DAYS_TO_EXAM = 45;
const STREAK_DAYS = 4;

/**
 * F-21 adds this route; until it lands, typed routes have never heard of it, so the href is
 * cast the way `returnTo` targets already are rather than left untyped.
 */
const STUDY: Href = '/(tabs)/study' as Href;

/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/** F-07 / F-20 — home. Open to guests; the actions on it collect an account when they need one. */
export default function HomeRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const phone = useSessionStore((s) => s.phone);
  const { ensure, signedIn } = useRequireAuth();

  return (
    <HomeView
      name={elide(phone)}
      signedIn={signedIn}
      lang={lang}
      onLang={setLang}
      daysToExam={DAYS_TO_EXAM}
      streakDays={STREAK_DAYS}
      // The header link has no destination of its own: it signs you in and leaves you here.
      onSignIn={() => ensure('/(tabs)')}
      // Ungated, and `navigate` rather than `push`: reading material is open to anyone, and a
      // tab you are already on should be re-entered, not stacked a second time.
      onStudy={() => router.navigate(STUDY)}
      // `kind` picks the Previous-year shelf; F-22 teaches the library to read it.
      onPreviousPapers={() => router.navigate('/(tabs)/tests?kind=previous')}
      // The paper the card is pitching — never an id repeated by hand (F-09 owns `test/[id]`).
      onStartMock={() => ensure(`/test/${NEXT_MOCK.id}`)}
    />
  );
}
