import type { useRouter } from 'expo-router';

import { returnHref } from '@/data/href';

type Router = ReturnType<typeof useRouter>;

/**
 * A step opened from Profile to change one answer: it goes straight back where it came from.
 *
 * `canGoBack()` cannot tell an edit from the sign-up walk on its own — during sign-up, step 2
 * always has step 1 behind it — so the caller decides which of the two it is and this only
 * handles the return.
 */
export function returnFromEdit(router: Router, returnTo?: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  // Deep link straight into the step: there is no screen on the stack to return to.
  router.replace(returnHref(returnTo) ?? '/(tabs)/profile');
}

/**
 * The end of the sign-up walk. Since F-19 the walk can be entered from anywhere — a paper, a
 * drill, a Profile row — so it lands on whatever asked for the account, and on the shell only
 * when nothing did. `replace`, so the finished steps are not left on the back stack.
 */
export function leaveOnboarding(router: Router, returnTo?: string): void {
  router.replace(returnHref(returnTo) ?? '/(tabs)');
}
