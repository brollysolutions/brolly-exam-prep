import {
  EXAM_INFO,
  latestAffairs,
  latestNotices,
  STUDY_TOPICS,
} from '@tslprb/fixtures/src/runtime';
import { useRouter } from 'expo-router';

import { streakDays, todayProgress, useActivityStore } from '@/data/activity';
import { attemptCount, bestPercent, useHistoryStore } from '@/data/history';
import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { useStudyStore } from '@/data/study';
import { useNow } from '@/data/useNow';
import { daysUntil, fullDate } from '@/features/home/dates';
import { HomeView } from '@/features/home/HomeView';

/**
 * The head of each shelf, taken once at module load rather than on every render: the
 * fixtures are static. Three is what fits — the shelves are a trailer for `/updates` and
 * `/affairs`, and both section heads lead off to the full list.
 */
const SHELF_NOTICES = latestNotices(3);
const SHELF_AFFAIRS = latestAffairs(3);

/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/**
 * F-23 — Home v3. Everything on the screen is composed here from the local stores and the
 * fixtures, so `HomeView` stays a pure function of its props and the dev gallery can render
 * any state of it.
 *
 * No subscription to the attempt store: the Continue card that needed it was removed at the
 * user's request (2026-09-03), and Home stays mounted under `/test/[id]`, so a subscription
 * would re-render this screen on every option tap of a two-hundred-question paper for nothing.
 */
export default function HomeRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const phone = useSessionStore((s) => s.phone);
  const { ensure, signedIn } = useRequireAuth();

  const read = useStudyStore((s) => s.read);
  const byDay = useActivityStore((s) => s.byDay);
  const attempts = useHistoryStore((s) => s.attempts);

  // A snapshot, not a clock: Home shows a day count, which has no need to move while it is
  // being watched. `useNow` re-reads on the way back from the background and on focus, the
  // two ways this screen can go stale.
  const now = useNow();

  // --------------------------------------------------------------- progress
  const best = bestPercent({ attempts });

  return (
    <HomeView
      name={elide(phone)}
      signedIn={signedIn}
      lang={lang}
      onLang={setLang}
      daysToExam={daysUntil(EXAM_INFO.pwtDate, now)}
      examDate={fullDate(EXAM_INFO.pwtDate)}
      examLabel={EXAM_INFO.label[lang]}
      streakDays={streakDays({ byDay }, now)}
      today={todayProgress({ byDay }, undefined, now)}
      notices={SHELF_NOTICES}
      affairs={SHELF_AFFAIRS}
      progress={{
        topicsRead: STUDY_TOPICS.reduce((n, t) => (read[t.id] ? n + 1 : n), 0),
        topicsTotal: STUDY_TOPICS.length,
        papers: attemptCount({ attempts }),
        // Rounded: a stat tile has room for a number, not for two decimal places of one.
        bestPct: best === undefined ? undefined : Math.round(best),
      }}
      // The header link has no destination of its own: it signs you in and leaves you here.
      onSignIn={() => ensure('/(tabs)')}
      onOpenUpdates={() => router.push('/updates')}
      // The object form, not `/updates?open=${id}`: expo-router encodes the param, so an id
      // is never pasted into a path.
      onOpenNotice={(id) => router.push({ pathname: '/updates', params: { open: id } })}
      onOpenPhysical={() => router.push('/eligibility')}
      onOpenAffairs={() => router.push('/affairs')}
    />
  );
}
