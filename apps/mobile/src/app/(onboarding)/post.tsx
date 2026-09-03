import { useLocalSearchParams, useRouter } from 'expo-router';

import { withReturnTo } from '@/data/href';
import { isOnboarded, useSessionStore } from '@/data/session';
import { PostView } from '@/features/onboarding/PostView';
import { returnFromEdit } from '@/features/onboarding/returnTo';

/** F-05 — onboarding step 1: which post the user is preparing for. */
export default function PostRoute() {
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const post = useSessionStore((s) => s.post);
  const setPost = useSessionStore((s) => s.setPost);
  // A first-run sign-up starts here, so there is nothing behind it to go back to.
  const canGoBack = router.canGoBack();
  // Someone who has already answered both questions is here to change one, not to sign up.
  const editing = useSessionStore(isOnboarded);

  return (
    <PostView
      initialPost={post}
      onSubmit={(next) => {
        setPost(next);
        if (editing) returnFromEdit(router, returnTo);
        // The walk carries the destination on, so step 2 knows where the chain ends.
        else router.push(withReturnTo('/(onboarding)/category', returnTo));
      }}
      onBack={canGoBack ? () => router.back() : undefined}
    />
  );
}
