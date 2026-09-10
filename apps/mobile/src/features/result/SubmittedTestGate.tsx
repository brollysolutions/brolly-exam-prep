import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { useAttemptStore } from '@/data/attempt';
import { useCompletedTestsStore } from '@/data/completedTests';
import { testAttemptHref } from '@/data/testRoutes';

/** Do not mount the result/solution loader until this imported paper has been submitted. */
export function SubmittedTestGate({ id, children }: { id: string; children: ReactNode }) {
  const running = useAttemptStore((s) => s.testId === id && s.status === 'running');
  const completed = useCompletedTestsStore((s) => s.tests[id]);
  const submitted = useAttemptStore(
    (s) => s.testId === id && ['submitted', 'autoSubmitted'].includes(s.status),
  );
  if (running || (!completed && !submitted)) {
    return <Redirect href={testAttemptHref(id)} />;
  }
  return children;
}
