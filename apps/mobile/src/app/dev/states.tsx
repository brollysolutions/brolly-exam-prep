import { Redirect } from 'expo-router';

// Metro removes this development-only branch from release bundles.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StatesView = __DEV__ ? require('@/features/dev/StatesView').StatesView : null;

/**
 * Design-system state matrix. Not linked from production UI — and not reachable in a
 * release bundle either: Expo Router registers every file under `src/app`, so a typed
 * URL would otherwise open the gallery on a shipped build.
 */
export default function DevStatesRoute() {
  if (!StatesView) return <Redirect href="/" />;
  return <StatesView />;
}
