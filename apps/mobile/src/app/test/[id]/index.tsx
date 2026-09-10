import { SI_MOCK_01_ID } from '@tslprb/fixtures/src/runtime';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { SI_MOCK_ATTEMPT_PATH } from '@/data/testRoutes';
import { TestAttemptScreen } from '@/features/attempt/TestAttemptScreen';

export default function TestAttemptRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // Keep old SI bookmarks working without mounting or restarting the attempt here.
  if (id === SI_MOCK_01_ID) return <Redirect href={SI_MOCK_ATTEMPT_PATH} />;
  return <TestAttemptScreen id={id} />;
}
