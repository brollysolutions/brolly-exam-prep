import { isImportedTest } from '@tslprb/fixtures';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { getApi } from '@/data/api';
import { useLangStore } from '@/data/lang';
import { PaperView } from '@/features/paper/PaperView';
import { useLoad } from '@/features/result/useLoad';

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
    const api = getApi();
    const [meta, questions] = await Promise.all([api.getTestMeta(id), api.getPaper(id)]);
    return { meta, questions };
  }, [id]);
  const { done, data, failed } = useLoad(`${id}:${attempt}`, load);
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
