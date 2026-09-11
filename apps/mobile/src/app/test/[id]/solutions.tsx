import { isImportedTest } from '@/data/content';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getImportedReviewPaper } from '@/data/importedAttempt';
import { getResultReadCache, useCachedLoad } from '@/data/offline';
import { offlineUserId, useSessionStore } from '@/data/session';
import { testIdFromRoute, testSolutionsHref } from '@/data/testRoutes';
import { useNetwork } from '@/data/useNetwork';
import { SolutionsView } from '@/features/result/SolutionsView';
import { SubmittedTestGate } from '@/features/result/SubmittedTestGate';
import { buildSolutionRows } from '@/features/result/solutions';

/** F-13 — answers & explanation: the review rows joined to the paper they were marked against. */
export default function SolutionsRoute() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  if (isImportedTest(routeId)) return <Redirect href={testSolutionsHref(routeId)} />;
  const id = testIdFromRoute(routeId);
  return (
    <SubmittedTestGate id={id}>
      <SolutionsContent id={id} />
    </SubmittedTestGate>
  );
}

function SolutionsContent({ id }: { id: string }) {
  const router = useRouter();
  const { t } = useTranslation();
  const [attempt, setAttempt] = useState(0);
  const { offline } = useNetwork();
  const userId = useSessionStore(offlineUserId);

  const load = useCallback(async () => {
    if (isImportedTest(id)) {
      return { fresh: Promise.resolve(buildSolutionRows(getImportedReviewPaper(id))) };
    }
    if (!userId) return { fresh: Promise.reject(new Error('No result cache owner')) };
    const read = await (await getResultReadCache()).readPaper(
      { userId },
      id,
      { refresh: !offline },
    );
    return {
      cached: read.cached && buildSolutionRows(read.cached),
      fresh: read.fresh.then(buildSolutionRows),
    };
  }, [id, offline, userId]);
  const { done, data, failed } = useCachedLoad(`${id}:${attempt}`, load);

  return (
    <SolutionsView
      initialFilter={isImportedTest(id) ? 'all' : 'wrong'}
      rows={done ? data : undefined}
      failed={failed}
      failureMessage={offline ? t('solutions.offlineNotCached') : undefined}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
