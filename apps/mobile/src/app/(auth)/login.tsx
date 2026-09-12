import { useLocalSearchParams, useRouter } from 'expo-router';

import { returnHref, withReturnTo } from '@/data/href';
import { isOnboarded, useSessionStore } from '@/data/session';
import { LoginView } from '@/features/auth/LoginView';

/** Temporary local testing login. Replace with verified OTP login before production. */
export default function LoginRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const phone = useSessionStore((s) => s.phone);
  const startTestingSession = useSessionStore((s) => s.startTestingSession);
  const canGoBack = router.canGoBack();

  const submit = (next: string) => {
    if (!/^\d{10}$/.test(next)) return;
    startTestingSession(next);
    router.replace(
      isOnboarded(useSessionStore.getState())
        ? (returnHref(returnTo) ?? '/(tabs)')
        : withReturnTo('/(onboarding)/post', returnTo),
    );
  };

  return (
    <LoginView
      initialPhone={phone}
      onSubmit={submit}
      onBack={canGoBack ? () => router.back() : undefined}
    />
  );
}
