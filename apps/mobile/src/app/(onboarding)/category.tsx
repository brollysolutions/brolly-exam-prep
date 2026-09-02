import { useLocalSearchParams, useRouter } from 'expo-router';

import { useSessionStore } from '@/data/session';
import { CategoryView } from '@/features/onboarding/CategoryView';
import { leaveOnboarding } from '@/features/onboarding/returnTo';

/** F-06 — onboarding step 2: the category the PWT cut-off is read from. */
export default function CategoryRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const category = useSessionStore((s) => s.category);
  const setCategory = useSessionStore((s) => s.setCategory);
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);

  return (
    <CategoryView
      initialCategory={category}
      onSubmit={(next) => {
        setCategory(next);
        completeOnboarding();
        leaveOnboarding(router, returnTo, () => router.replace('/(tabs)'));
      }}
      onBack={() => router.back()}
    />
  );
}
