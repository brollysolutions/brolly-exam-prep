import { useRouter } from 'expo-router';

import { useSessionStore } from '@/data/session';
import { CategoryView } from '@/features/onboarding/CategoryView';

/** F-06 — onboarding step 2: the category the PWT cut-off is read from. */
export default function CategoryRoute() {
  const router = useRouter();
  const category = useSessionStore((s) => s.category);
  const setCategory = useSessionStore((s) => s.setCategory);
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);

  return (
    <CategoryView
      initialCategory={category}
      onSubmit={(next) => {
        setCategory(next);
        completeOnboarding();
        router.replace('/(tabs)');
      }}
      onBack={() => router.back()}
    />
  );
}
