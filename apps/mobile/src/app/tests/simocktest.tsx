import { SI_MOCK_01_ID } from '@tslprb/fixtures/src/runtime';

import { TestAttemptScreen } from '@/features/attempt/TestAttemptScreen';

/** The SI paper keeps its stored ID while using the requested public attempt URL. */
export default function SIMockTestRoute() {
  return <TestAttemptScreen id={SI_MOCK_01_ID} />;
}
