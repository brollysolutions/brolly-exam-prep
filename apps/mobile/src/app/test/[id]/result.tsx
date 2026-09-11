import { isImportedTest, useContentData } from '@/data/content';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCompletedTestsStore } from '@/data/completedTests';
import { getResultReadCache, useCachedLoad } from '@/data/offline';
import { offlineUserId, useSessionStore } from '@/data/session';
import { testIdFromRoute, testResultHref, testSolutionsHref } from '@/data/testRoutes';
import { useNetwork } from '@/data/useNetwork';
import { ResultView } from '@/features/result/ResultView';
import { SubmittedTestGate } from '@/features/result/SubmittedTestGate';

/** F-12 — result & analysis for one test. `id` is the test id, as in the spec's route table. */
export default function ResultRoute() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  if (isImportedTest(routeId)) return <Redirect href={testResultHref(routeId)} />;
  const id = testIdFromRoute(routeId);
  return (
    <SubmittedTestGate id={id}>
      <ResultContent id={id} />
    </SubmittedTestGate>
  );
}

function ResultContent({ id }: { id: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const { offline } = useNetwork();
  const userId = useSessionStore(offlineUserId);
  const content = useContentData();
  const importedResult = useCompletedTestsStore((state) => state.tests[id]?.result);

  const load = useCallback(async () => {
    if (isImportedTest(id) && importedResult) {
      return { fresh: Promise.resolve(importedResult) };
    }
    if (!userId) return { fresh: Promise.reject(new Error('No result cache owner')) };
    return (await getResultReadCache()).readDetail({ userId }, id, { refresh: !offline });
  }, [id, importedResult, offline, userId]);
  const { done, data, failed } = useCachedLoad(`${id}:${attempt}`, load);

  const openSolutions = useCallback(() => {
    router.push(testSolutionsHref(id));
  }, [router, id]);

  return (
    <ResultView
      reviewAll={isImportedTest(id)}
      result={done ? data : undefined}
      costRows={content.costRows}
      failed={failed}
      failureMessage={offline ? t('result.offlineNotCached') : undefined}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
      onSeeWrong={openSolutions}
      // Every drill card leads to the wrong answers for now; the sectional drills land later.
      onAction={openSolutions}
    />
  );
}
