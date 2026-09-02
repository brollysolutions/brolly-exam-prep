import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Where an onboarding step goes when it is done.
 *
 * The two steps are reached from two directions: the sign-up flow, where step 1 walks to
 * step 2 and step 2 opens the app; and Profile, where either one is a single edit that has
 * to come straight back. `?returnTo=` is what tells them apart — `canGoBack()` cannot, because
 * during sign-up step 2 always has step 1 behind it.
 */
export function leaveOnboarding(
  router: Router,
  returnTo: string | undefined,
  fallthrough: () => void,
): void {
  if (!returnTo) {
    fallthrough();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  // Deep link straight into the step: there is no Profile on the stack to return to.
  router.replace('/(tabs)/profile');
}
