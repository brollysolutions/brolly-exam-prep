import { Redirect } from 'expo-router';

import { useSessionStore } from '@/data/session';

/**
 * Boot router: a first launch gets the intro, signed-out users the auth stack, everyone
 * with a token and both onboarding answers the tab shell.
 */
export default function Index() {
  const token = useSessionStore((s) => s.token);
  const onboarded = useSessionStore((s) => s.onboarded);
  const seenWelcome = useSessionStore((s) => s.seenWelcome);
  if (!token) return <Redirect href={seenWelcome ? '/(auth)/login' : '/(onboarding)/welcome'} />;
  if (!onboarded) return <Redirect href="/(onboarding)/post" />;
  return <Redirect href="/(tabs)" />;
}
