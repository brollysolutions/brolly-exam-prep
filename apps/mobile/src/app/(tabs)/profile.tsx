import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { useAttemptStore } from '@/data/attempt';
import { useLangStore } from '@/data/lang';
import { useSessionStore } from '@/data/session';
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
  const logout = useSessionStore((s) => s.logout);

  const signOut = () => {
    logout();
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
      onEditPost={() => router.push('/(onboarding)/post')}
      onEditCategory={() => router.push('/(onboarding)/category')}
      onLogout={signOut}
      onDelete={() => {
        // Deleting the account clears the attempt in progress too: nothing of this person
        // may survive on a handset that is often shared.
        useAttemptStore.getState().reset();
        signOut();
      }}
    />
  );
}
