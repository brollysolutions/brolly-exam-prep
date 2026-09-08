import { isImportedTest } from '@tslprb/fixtures';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { getApi } from '@/data/api';
import { testIdFromRoute, testSolutionsHref } from '@/data/testRoutes';
import { SolutionsView } from '@/features/result/SolutionsView';
import { SubmittedTestGate } from '@/features/result/SubmittedTestGate';
import { buildSolutionRows } from '@/features/result/solutions';
import { useLoad } from '@/features/result/useLoad';

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
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const api = getApi();
    const [detail, paper] = await Promise.all([api.getResultDetail(id), api.getPaper(id)]);
    return buildSolutionRows(detail.review, paper);
  }, [id]);
  const { done, data, failed } = useLoad(`${id}:${attempt}`, load);

  return (
    <SolutionsView
      initialFilter={isImportedTest(id) ? 'all' : 'wrong'}
      rows={done ? data : undefined}
      failed={failed}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
