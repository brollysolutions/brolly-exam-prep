import { useRouter } from 'expo-router';

import { useSessionStore } from '@/data/session';
import { WelcomeView } from '@/features/onboarding/WelcomeView';

/** F-02 — the intro slides, shown once per handset before the first sign-in. */
export default function WelcomeRoute() {
  const router = useRouter();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);

  return (
    <WelcomeView
      onDone={() => {
        markWelcomeSeen();
        router.replace('/(auth)/login');
      }}
    />
  );
}
