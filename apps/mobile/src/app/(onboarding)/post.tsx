import { useRouter } from 'expo-router';

import { useSessionStore } from '@/data/session';
import { PostView } from '@/features/onboarding/PostView';

/** F-05 — onboarding step 1: which post the user is preparing for. */
export default function PostRoute() {
  const router = useRouter();
  const post = useSessionStore((s) => s.post);
  const setPost = useSessionStore((s) => s.setPost);

  return (
    <PostView
      initialPost={post}
      onSubmit={(next) => {
        setPost(next);
        router.push('/(onboarding)/category');
      }}
    />
  );
}
