import { EXAM_INFO, findStudyTopic, STUDY_TOPICS, TESTS } from '@tslprb/fixtures';
import { useRouter, type Href } from 'expo-router';

import { streakDays, todayProgress, useActivityStore } from '@/data/activity';
import { useAttemptStore } from '@/data/attempt';
import { counts, remainingMs } from '@/data/attempt.selectors';
import { attemptCount, bestScore, useHistoryStore } from '@/data/history';
import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { useStudyStore } from '@/data/study';
import { useNow } from '@/data/useNow';
import { HomeView, type HomeContinue } from '@/features/home/HomeView';
import { daysUntil, fullDate, SAMPLE_AFFAIRS, SAMPLE_NOTICES } from '@/features/home/homeData';

/**
 * Routes F-24 and F-25 own. Home links to them before they exist, because the alternative is
 * shipping the screen with three dead cards and wiring them afterwards.
 */
// F-24 add this route
const UPDATES = '/updates' as Href;
// F-24 add this route
const AFFAIRS = '/affairs' as Href;
// F-25 add this route
const ELIGIBILITY = '/eligibility' as Href;

/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/**
 * F-23 — Home v3. Everything on the screen is composed here from the local stores and the
 * fixtures, so `HomeView` stays a pure function of its props and the dev gallery can render
 * any state of it.
 */
export default function HomeRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const phone = useSessionStore((s) => s.phone);
  const { ensure, signedIn } = useRequireAuth();

  /**
   * Three primitives, not the whole attempt: `/test/[id]` is pushed OVER the tabs, so Home
   * stays mounted underneath it and a subscription to the store itself would re-render this
   * screen on every option tap, palette move and mark of a two-hundred-question paper.
   */
  const runningTestId = useAttemptStore((s) => (s.status === 'running' ? s.testId : undefined));
  const answered = useAttemptStore((s) => (s.status === 'running' ? counts(s).answered : 0));
  const endsAt = useAttemptStore((s) => (s.status === 'running' ? s.endsAt : undefined));
  const read = useStudyStore((s) => s.read);
  const lastRead = useStudyStore((s) => s.lastRead);
  const byDay = useActivityStore((s) => s.byDay);
  const attempts = useHistoryStore((s) => s.attempts);

  // A snapshot, not a clock: Home shows a day count and a paper's remaining time, neither of
  // which has to move while it is being watched. `useNow` re-reads on the way back from the
  // background, which is the only way this screen can go stale.
  const now = useNow();

  // --------------------------------------------------------------- continue
  // Priority: a paper still running, then the topic last open, then the first never opened.
  const runningTest = TESTS.find((test) => test.id === runningTestId);
  const bookmarked = findStudyTopic(lastRead?.id);
  const nextUnread = STUDY_TOPICS.find((topic) => !read[topic.id]);
  const topic = bookmarked?.topic ?? nextUnread;

  const continueItem: HomeContinue | undefined = runningTestId
    ? {
        kind: 'mock',
        // The id is the fallback title: a running attempt on a paper the fixtures no longer
        // list still has to be resumable.
        title: runningTest?.title[lang] ?? runningTestId,
        answered,
        remainingSec: Math.round(remainingMs({ endsAt }, now) / 1000),
      }
    : topic
      ? {
          kind: bookmarked ? 'reading' : 'start',
          title: topic.title[lang],
          minutes: topic.minutes,
        }
      : undefined;

  // --------------------------------------------------------------- progress
  const best = bestScore({ attempts });

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
      continueItem={continueItem}
      // F-24 replaces with @tslprb/fixtures
      notices={SAMPLE_NOTICES}
      affairs={SAMPLE_AFFAIRS}
      progress={{
        topicsRead: STUDY_TOPICS.reduce((n, t) => (read[t.id] ? n + 1 : n), 0),
        topicsTotal: STUDY_TOPICS.length,
        papers: attemptCount({ attempts }),
        // Rounded: a stat tile has room for a number, not for two decimal places of one.
        bestScore: best === undefined ? undefined : Math.round(best),
      }}
      // The header link has no destination of its own: it signs you in and leaves you here.
      onSignIn={() => ensure('/(tabs)')}
      // `navigate` rather than `push`: a tab you are already on should be re-entered, not
      // stacked a second time.
      onOpenTests={() => router.navigate('/(tabs)/tests')}
      onContinue={() => {
        // Sitting a paper is the one thing on this screen that needs an account (F-19).
        if (runningTestId) ensure(`/test/${runningTestId}`);
        else if (topic) router.push({ pathname: '/study/[topic]', params: { topic: topic.id } });
      }}
      onOpenUpdates={() => router.push(UPDATES)}
      onOpenPhysical={() => router.push(ELIGIBILITY)}
      onOpenAffairs={() => router.push(AFFAIRS)}
    />
  );
}
