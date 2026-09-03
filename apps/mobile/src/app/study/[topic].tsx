import { findStudyTopic } from '@tslprb/fixtures';
import { useLocalSearchParams, useRouter } from 'expo-router';

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

  const found = findStudyTopic(id);

  return (
    <TopicView
      topic={found?.topic}
      section={found?.section}
      lang={lang}
      onLang={setLang}
      read={read}
      onBack={() => router.back()}
      onMarkRead={() => {
        if (found) markRead(found.topic.id);
      }}
      // `navigate`, not `push`: the library is a tab that already exists in the stack, and a
      // second copy of it behind this screen would give the back button somewhere wrong to go.
      onPractise={() => router.navigate('/(tabs)/tests?kind=sectional')}
    />
  );
}
