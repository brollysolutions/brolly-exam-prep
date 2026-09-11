import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getApi } from '@/data/api';
import { withReturnTo } from '@/data/href';
import { reconcileSignedInUserScope } from '@/data/offline';
import { useSessionStore } from '@/data/session';
import { LoginView } from '@/features/auth/LoginView';
import { useAutoDismiss } from '@/ui';

/**
 * F-03 — the number is the whole sign-in. The OTP screen that used to sit between this screen
 * and onboarding was removed on 2026-09-07 at the product owner's request, so this one call
 * both creates the account on a number's first sighting and signs it in on every later one.
 *
 * Nothing proves the number belongs to whoever typed it. That is the accepted trade-off for
 * this phase and the reason the app must hold nothing behind it that a stranger may not see.
 */
export default function LoginRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  // Where the chain ends: whatever the user tapped that needed an account (F-19).
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const phone = useSessionStore((s) => s.phone);
  const setPhone = useSessionStore((s) => s.setPhone);
  const setUserId = useSessionStore((s) => s.setUserId);
  const setToken = useSessionStore((s) => s.setToken);
  // The screen now stands on top of a working app; only a first run or a deep link has
  // nothing behind it, and then there is nothing to offer a way back to.
  const canGoBack = router.canGoBack();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The banner is not a state the user has to dismiss; it goes on its own.
  const shownError = useAutoDismiss(error);

  const submit = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      const { token, user } = await getApi().signInWithPhone({ phone: next });
      setPhone(next);
      setUserId(user.id);
      setToken(token);
      // Adopt any offline data this number played before it had a backend user id, so a
      // local-only attempt created under the phone-only scope can now reach the server.
      void reconcileSignedInUserScope(next, user.id).catch(() => undefined);
      // `replace`, not `push`: there is no step between the number and the questions any more,
      // so the back gesture from onboarding should leave the sign-in chain rather than return
      // to a form that has already done its work.
      router.replace(withReturnTo('/(onboarding)/post', returnTo));
    } catch {
      setError(t('common.networkError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LoginView
      initialPhone={phone}
      busy={busy}
      error={shownError}
      onSubmit={(next) => {
        void submit(next);
      }}
      onBack={canGoBack ? () => router.back() : undefined}
    />
  );
}
