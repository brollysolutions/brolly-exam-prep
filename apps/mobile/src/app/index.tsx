import { Redirect } from 'expo-router';

import { useSessionStore } from '@/data/session';

/**
 * Boot router. A first launch gets the intro slides; every launch after that opens the app,
 * signed in or not.
 *
 * F-19: there is no login at the door. The dashboard, the library and the settings are all
 * readable as a guest, and an account is asked for at the point one is needed — see
 * `useRequireAuth`.
 */
export default function Index() {
  const seenWelcome = useSessionStore((s) => s.seenWelcome);
  if (!seenWelcome) return <Redirect href="/(onboarding)/welcome" />;
  return <Redirect href="/(tabs)" />;
}
