import { Redirect } from 'expo-router';

import { StatesView } from '@/features/dev/StatesView';

/**
 * Design-system state matrix. Not linked from production UI — and not reachable in a
 * release bundle either: Expo Router registers every file under `src/app`, so a typed
 * URL would otherwise open the gallery on a shipped build.
 */
export default function DevStatesRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <StatesView />;
}
