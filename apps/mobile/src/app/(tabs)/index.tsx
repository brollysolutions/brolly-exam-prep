import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { HomeView, NEXT_MOCK } from '@/features/home/HomeView';

/** Fixture values until the API serves a notified exam date and a real practice streak. */
const DAYS_TO_EXAM = 45;
const STREAK_DAYS = 4;

/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/** F-07 — home. Open to guests; the actions on it collect an account when they need one. */
export default function HomeRoute() {
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
      // The paper the card is pitching — never an id repeated by hand (F-09 owns `test/[id]`).
      onStartMock={() => ensure(`/test/${NEXT_MOCK.id}`)}
      // `navigate`, not `push`: a tab is a place you go back to, not a card you stack.
      onWeakTopic={() => ensure('/(tabs)/tests', 'navigate')}
    />
  );
}
