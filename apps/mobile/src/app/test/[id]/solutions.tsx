import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';

import { getApi } from '@/data/api';
import { SolutionsView } from '@/features/result/SolutionsView';
import { buildSolutionRows } from '@/features/result/solutions';
import { useLoad } from '@/features/result/useLoad';

/** F-13 — answers & explanation: the review rows joined to the paper they were marked against. */
export default function SolutionsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async () => {
    const api = getApi();
    const [detail, paper] = await Promise.all([api.getResultDetail(id), api.getPaper(id)]);
    return buildSolutionRows(detail.review, paper);
  }, [id]);
  const { data, failed } = useLoad(`${id}:${attempt}`, load);

  return (
    <SolutionsView
      rows={data}
      failed={failed}
      onBack={() => router.back()}
      onRetry={() => setAttempt((n) => n + 1)}
    />
  );
}
