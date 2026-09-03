import { useLocalSearchParams, useRouter } from 'expo-router';

import { isOnboarded, useSessionStore } from '@/data/session';
import { CategoryView } from '@/features/onboarding/CategoryView';
import { leaveOnboarding, returnFromEdit } from '@/features/onboarding/returnTo';

/** F-06 — onboarding step 2: the category the PWT cut-off is read from. */
export default function CategoryRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const category = useSessionStore((s) => s.category);
  const setCategory = useSessionStore((s) => s.setCategory);
  const completeOnboarding = useSessionStore((s) => s.completeOnboarding);
  // Read before the submit sets it: someone already onboarded is changing one answer.
  const editing = useSessionStore(isOnboarded);

  return (
    <CategoryView
      initialCategory={category}
      onSubmit={(next) => {
        setCategory(next);
        completeOnboarding();
        if (editing) returnFromEdit(router, returnTo);
        else leaveOnboarding(router, returnTo);
      }}
      onBack={() => router.back()}
    />
  );
}
