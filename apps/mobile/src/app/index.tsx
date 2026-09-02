import { Redirect } from 'expo-router';

import { useSessionStore } from '@/data/session';

/** Boot router: signed-out users land in the auth stack, everyone else in the app shell. */
export default function Index() {
  const token = useSessionStore((s) => s.token);
  const onboarded = useSessionStore((s) => s.onboarded);
  if (!token) return <Redirect href="/(auth)/login" />;
  if (!onboarded) return <Redirect href="/(onboarding)/post" />;
  // TODO(F-07): replace with `/(tabs)` once the tab shell exists.
  return <Redirect href="/dev/states" />;
}
