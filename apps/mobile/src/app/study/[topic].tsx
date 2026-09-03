import { findStudyTopic } from '@tslprb/fixtures';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useActivityStore } from '@/data/activity';
import { useLangStore } from '@/data/lang';
import { useStudyStore } from '@/data/study';
import { TopicView } from '@/features/study/TopicView';

/**
 * F-21 — one study topic. `topic` is the fixture id; an id the shelf does not hold falls
 * through to the view's not-found state rather than redirecting, because a mistyped deep
 * link should say what went wrong where the user is looking.
 */
export default function StudyTopicRoute() {
  const { topic: id } = useLocalSearchParams<{ topic: string }>();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const read = useStudyStore((s) => (id ? Boolean(s.read[id]) : false));
  const markRead = useStudyStore((s) => s.markRead);
  const open = useStudyStore((s) => s.open);

  const found = findStudyTopic(id);
  const foundId = found?.topic.id;

  // F-23 — the bookmark Home's Continue card reads. Opening the page is what sets it: a
  // candidate who put the phone down mid-topic is still in that topic, marked read or not.
  useEffect(() => {
    if (foundId) open(foundId);
  }, [foundId, open]);

  return (
    <TopicView
      topic={found?.topic}
      section={found?.section}
      lang={lang}
      onLang={setLang}
      read={read}
      onBack={() => router.back()}
      onMarkRead={() => {
        if (!foundId) return;
        // Only the first time counts towards the day: the view turns the button into a badge
        // once read, but a deep link back onto the page must not be able to inflate the day.
        // Bumped from the route, never from `study.ts` — no store imports another store.
        const first = !useStudyStore.getState().read[foundId];
        markRead(foundId);
        if (first) useActivityStore.getState().bump('topicsRead');
      }}
      // `navigate`, not `push`: the library is a tab that already exists in the stack, and a
      // second copy of it behind this screen would give the back button somewhere wrong to go.
      onPractise={() => router.navigate('/(tabs)/tests?kind=sectional')}
    />
  );
}
