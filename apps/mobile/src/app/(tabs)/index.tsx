import { useRouter } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { useSessionStore } from '@/data/session';
import { HomeView } from '@/features/home/HomeView';

/** Fixture values until the API serves a notified exam date and a real practice streak. */
const DAYS_TO_EXAM = 45;
const NEXT_MOCK_ID = 'mock-08';
const STREAK_DAYS = 4;

/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/** F-07 — home. */
export default function HomeRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const phone = useSessionStore((s) => s.phone);

  return (
    <HomeView
      name={elide(phone)}
      lang={lang}
      onLang={setLang}
      daysToExam={DAYS_TO_EXAM}
      streakDays={STREAK_DAYS}
      // F-09 owns `test/[id]`; until it lands this is the one link out of the shell.
      onStartMock={() => router.push(`/test/${NEXT_MOCK_ID}`)}
      // `navigate`, not `push`: a tab is a place you go back to, not a card you stack.
      onWeakTopic={() => router.navigate('/(tabs)/tests')}
    />
  );
}
