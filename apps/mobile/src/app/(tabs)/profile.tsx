import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { useLangStore } from '@/data/lang';
import { useSessionStore } from '@/data/session';
import { signOut } from '@/data/signOut';
import { ProfileView } from '@/features/profile/ProfileView';

const VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** F-14 — profile and settings. */
export default function ProfileRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const post = useSessionStore((s) => s.post);
  const category = useSessionStore((s) => s.category);
  const notifications = useSessionStore((s) => s.notifications);
  const setNotifications = useSessionStore((s) => s.setNotifications);

  /**
   * Both exits use the shared `signOut()`, which clears the attempt store as well as the
   * session: leaving a half-finished paper on disk would drop the next person on a shared
   * handset straight into someone else's running test.
   */
  const leave = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  return (
    <ProfileView
      post={post}
      category={category}
      lang={lang}
      notifications={notifications}
      version={VERSION}
      onLang={setLang}
      onNotifications={setNotifications}
      // `returnTo` sends the step straight back here instead of walking the sign-up flow on.
      onEditPost={() => router.push('/(onboarding)/post?returnTo=profile')}
      onEditCategory={() => router.push('/(onboarding)/category?returnTo=profile')}
      onLogout={leave}
      onDelete={leave}
    />
  );
}
