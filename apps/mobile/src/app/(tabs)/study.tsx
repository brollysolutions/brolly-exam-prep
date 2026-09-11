import { useRouter } from 'expo-router';

import { useContentData } from '@/data/content';
import { useLangStore } from '@/data/lang';
import { useStudyStore } from '@/data/study';
import { StudyView } from '@/features/study/StudyView';

/**
 * F-21 — study material. No gate anywhere on this tab: the syllabus is what brings someone
 * back to the app, and asking a guest to sign in before reading it would cost more than it buys.
 */
export default function StudyRoute() {
  const content = useContentData();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const read = useStudyStore((s) => s.read);

  return (
    <StudyView
      lang={lang}
      read={read}
      sections={content.studySections}
      onOpen={(id) => router.push({ pathname: '/study/[topic]', params: { topic: id } })}
    />
  );
}
