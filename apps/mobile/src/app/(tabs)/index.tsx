import { latestAffairs, latestNotices, useContentData } from '@/data/content';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { streakDays, todayProgress, useActivityStore } from '@/data/activity';
import { attemptCount, bestPercent, useHistoryStore } from '@/data/history';
import { useLangStore } from '@/data/lang';
import { getDurableAttemptService, getPublicReadCache, resolveCachedRead } from '@/data/offline';
import { useRequireAuth } from '@/data/requireAuth';
import { offlineUserId, useSessionStore } from '@/data/session';
import { useStudyStore } from '@/data/study';
import { testAttemptHref } from '@/data/testRoutes';
import { useNow } from '@/data/useNow';
import { daysUntil, fullDate } from '@/features/home/dates';
import { HomeView } from '@/features/home/HomeView';

/**
 * The head of each shelf, taken once at module load rather than on every render: the
 * fixtures are static. Three is what fits — the shelves are a trailer for `/updates` and
 * `/affairs`, and both section heads lead off to the full list.
 */
/** The signed-in user, addressed by the only part of their number that is safe to show. */
const elide = (phone?: string) => (phone && phone.length >= 4 ? `…${phone.slice(-4)}` : undefined);

/**
 * F-23 — Home v3. Everything on the screen is composed here from the local stores and the
 * fixtures, so `HomeView` stays a pure function of its props and the dev gallery can render
 * any state of it.
 *
 * No subscription to the attempt store: the Continue card reads the durable SQLite record on
 * focus. Home stays mounted under `/test/[id]`, so subscribing to transient attempt state would
 * re-render this screen on every option tap of a two-hundred-question paper for nothing.
 */
export default function HomeRoute() {
  const content = useContentData();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const phone = useSessionStore((s) => s.phone);
  const attemptOwner = useSessionStore(offlineUserId);
  const { ensure, signedIn } = useRequireAuth();
  const [unfinished, setUnfinished] = useState<{
    owner: string;
    testId: string;
    title: { en: string; te: string };
    currentQuestion: number;
  }>();

  useFocusEffect(
    useCallback(() => {
      let live = true;
      void (async () => {
        if (!attemptOwner) {
          if (live) setUnfinished(undefined);
          return;
        }
        const durable = await getDurableAttemptService();
        const attempt = await durable.findLatest({ userId: attemptOwner });
        if (!attempt) {
          if (live) setUnfinished(undefined);
          return;
        }
        let title = { en: attempt.testId, te: attempt.testId };
        try {
          const cache = await getPublicReadCache();
          title = (await resolveCachedRead(cache.readTestMeta(attempt.testId))).title;
        } catch {
          // The stable test id is still enough to expose the resumable attempt.
        }
        if (live) {
          setUnfinished({
            owner: attemptOwner,
            testId: attempt.testId,
            title,
            currentQuestion: attempt.currentQuestion,
          });
        }
      })().catch(() => {
        if (live) setUnfinished(undefined);
      });
      return () => {
        live = false;
      };
    }, [attemptOwner]),
  );

  const read = useStudyStore((s) => s.read);
  const byDay = useActivityStore((s) => s.byDay);
  const attempts = useHistoryStore((s) => s.attempts);

  // A snapshot, not a clock: Home shows a day count, which has no need to move while it is
  // being watched. `useNow` re-reads on the way back from the background and on focus, the
  // two ways this screen can go stale.
  const now = useNow();

  // --------------------------------------------------------------- progress
  const best = bestPercent({ attempts });
  const resumable = unfinished?.owner === attemptOwner ? unfinished : undefined;

  return (
    <HomeView
      name={elide(phone)}
      signedIn={signedIn}
      lang={lang}
      onLang={setLang}
      daysToExam={daysUntil(content.examInfo.pwtDate, now)}
      examDate={fullDate(content.examInfo.pwtDate)}
      examLabel={content.examInfo.label[lang]}
      streakDays={streakDays({ byDay }, now)}
      today={todayProgress({ byDay }, undefined, now)}
      notices={latestNotices(3, content.notices)}
      affairs={latestAffairs(3, content.affairs)}
      progress={{
        topicsRead: content.studyTopics.reduce((n, topic) => (read[topic.id] ? n + 1 : n), 0),
        topicsTotal: content.studyTopics.length,
        papers: attemptCount({ attempts }),
        // Rounded: a stat tile has room for a number, not for two decimal places of one.
        bestPct: best === undefined ? undefined : Math.round(best),
      }}
      unfinishedAttempt={
        resumable
          ? {
              title: resumable.title[lang],
              currentQuestion: resumable.currentQuestion,
            }
          : undefined
      }
      onResumeAttempt={
        resumable
          ? () => router.push(testAttemptHref(resumable.testId))
          : undefined
      }
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
