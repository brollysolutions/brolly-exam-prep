import { SI_MOCK_01_ID, TESTS, isImportedTest } from '@tslprb/fixtures/src/runtime';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { loadCompletedResult } from '@/data/complete';
import { testIdFromRoute, testResultHref, testSolutionsHref } from '@/data/testRoutes';
import { ResultView } from '@/features/result/ResultView';
import { SubmittedTestGate } from '@/features/result/SubmittedTestGate';
import { useLoad } from '@/features/result/useLoad';

/** F-12 — result & analysis for one test. `id` is the test id, as in the spec's route table. */
export default function ResultRoute() {
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  if (routeId === SI_MOCK_01_ID) return <Redirect href={testResultHref(routeId)} />;
  const id = testIdFromRoute(routeId);
  return (
    <SubmittedTestGate id={id}>
      <ResultContent id={id} />
    </SubmittedTestGate>
  );
}

function ResultContent({ id }: { id: string }) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(() => loadCompletedResult(id), [id]);
  const { done, data, failed } = useLoad(`${id}:${attempt}`, load);

  const openSolutions = useCallback(() => {
    router.push(testSolutionsHref(id));
  }, [router, id]);

  return (
    <ResultView
      demo={TESTS.find((test) => test.id === id)?.demo}
      reviewAll={isImportedTest(id)}
      result={done ? data : undefined}
      failed={failed}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
      onSeeWrong={openSolutions}
      // Every drill card leads to the wrong answers for now; the sectional drills land later.
      onAction={openSolutions}
    />
  );
}
