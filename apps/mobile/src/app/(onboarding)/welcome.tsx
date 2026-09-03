import { useRouter } from 'expo-router';

import { useSessionStore } from '@/data/session';
import { WelcomeView } from '@/features/onboarding/WelcomeView';

/** F-02 — the intro slides, shown once per handset before the app opens. */
export default function WelcomeRoute() {
  const router = useRouter();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);

  return (
    <WelcomeView
      onDone={() => {
        markWelcomeSeen();
        // F-19: the slides hand over to the app, not to a sign-in form.
        router.replace('/(tabs)');
      }}
    />
  );
}
