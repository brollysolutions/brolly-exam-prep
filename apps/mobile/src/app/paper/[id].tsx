import { isImportedTest } from '@/data/content';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { useLangStore } from '@/data/lang';
import { getPublicReadCache, useCachedLoad } from '@/data/offline';
import { PaperView } from '@/features/paper/PaperView';

/**
 * F-22 — a previous year's question paper with the answers on it.
 *
 * No gate: there is no attempt here, nothing to score and nothing to keep, so an account
 * would buy the reader nothing. An id that is not a paper resolves to the not-found state
 * rather than a blank screen, and the header's back chevron is the way out of both.
 */
export default function PaperRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    // Imported mock solutions are available only through the submitted-test review flow.
    if (isImportedTest(id)) throw new Error('Mock tests are not previous-year papers');
    const cache = await getPublicReadCache();
    return cache.readTestBundle(id);
  }, [id]);
  const { done, data, failed } = useCachedLoad(`${id}:${attempt}`, load);
  const paper = done ? data : undefined;

  return (
    <PaperView
      title={paper?.meta.title[lang]}
      questions={paper?.questions}
      sections={paper?.meta.pattern.sections}
      lang={lang}
      failed={failed}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
