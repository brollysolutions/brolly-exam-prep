import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { withReturnTo, type ReturnTarget } from '@/data/href';
import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { signOut } from '@/data/signOut';
import { ProfileView } from '@/features/profile/ProfileView';

const VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** The two questions onboarding asks, in the order it asks them. */
type OnboardingStep = '/(onboarding)/post' | '/(onboarding)/category';

/** Everything a step opened from here has to come back to. */
const HERE: ReturnTarget = '/(tabs)/profile';

/** F-14 — profile and settings. */
export default function ProfileRoute() {
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const post = useSessionStore((s) => s.post);
  const category = useSessionStore((s) => s.category);
  const notifications = useSessionStore((s) => s.notifications);
  const setNotifications = useSessionStore((s) => s.setNotifications);
  const { ensure, signedIn, onboarded } = useRequireAuth();

  /**
   * Both exits use the shared `signOut()`, which clears the attempt store as well as the
   * session: leaving a half-finished paper on disk would drop the next person on a shared
   * handset straight into someone else's running test.
   */
  const leave = () => {
    signOut();
    // Not to the login form: since F-19 there is an app to be signed out *into*.
    router.replace('/(tabs)');
  };

  /**
   * A settings row is an edit only for someone who has already answered both questions.
   * For anyone else the same tap is the start of the sign-in chain — which ends back here.
   */
  const edit = (step: OnboardingStep) => {
    if (signedIn && onboarded) router.push(withReturnTo(step, HERE));
    else ensure(HERE);
  };

  return (
    <ProfileView
      post={post}
      category={category}
      signedIn={signedIn}
      lang={lang}
      notifications={notifications}
      version={VERSION}
      onLang={setLang}
      onNotifications={setNotifications}
      onSignIn={() => ensure(HERE)}
      // `returnTo` sends the step straight back here instead of walking the sign-up flow on.
      onEditPost={() => edit('/(onboarding)/post')}
      onEditCategory={() => edit('/(onboarding)/category')}
      onLogout={leave}
      onDelete={leave}
    />
  );
}
