import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { useContentData } from '@/data/content';
import { withReturnTo, type ReturnTarget } from '@/data/href';
import { useLangStore } from '@/data/lang';
import { useRequireAuth } from '@/data/requireAuth';
import { useSessionStore } from '@/data/session';
import { signOut, wipeLocalData } from '@/data/signOut';
import { ProfileView } from '@/features/profile/ProfileView';

const VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** The two questions onboarding asks, in the order it asks them. */
type OnboardingStep = '/(onboarding)/post' | '/(onboarding)/category';

/** Everything a step opened from here has to come back to. */
const HERE: ReturnTarget = '/(tabs)/profile';

/** F-14 — profile and settings. */
export default function ProfileRoute() {
  const content = useContentData();
  const router = useRouter();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const post = useSessionStore((s) => s.post);
  const category = useSessionStore((s) => s.category);
  const notifications = useSessionStore((s) => s.notifications);
  const setNotifications = useSessionStore((s) => s.setNotifications);
  const { ensure, signedIn, onboarded } = useRequireAuth();

  /**
   * Signing out erases the person from this handset, not just the token: the attempt, the
   * eligibility measurements, the scores, the streak and the read marks all go, because every
   * screen that shows them is open to a guest and these phones are shared. `ProfileView` asks
   * before calling this — none of it is stored anywhere else yet.
   */
  const leave = () => {
    signOut();
    // Not to the login form: since F-19 there is an app to be signed out *into*.
    router.replace('/(tabs)');
  };

  /**
   * "Delete everything" has to mean more than signing out, or the button lies. It clears the
   * language and the welcome flag too, so the app is back to a fresh install — hence `/`
   * rather than the tabs: the root route reads `seenWelcome` and shows the slides again.
   *
   * There is no account on a server to delete yet; that endpoint lands with the database.
   */
  const erase = () => {
    wipeLocalData();
    router.replace('/');
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
      categories={content.categories}
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
      onDelete={erase}
    />
  );
}
