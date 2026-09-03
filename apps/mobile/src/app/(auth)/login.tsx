import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getApi } from '@/data/api';
import { withReturnTo } from '@/data/href';
import { useSessionStore } from '@/data/session';
import { LoginView } from '@/features/auth/LoginView';
import { setOtpRequestId } from '@/features/auth/otpRequest';
import { useAutoDismiss } from '@/ui';

/** F-03 — asks for the phone number and requests the OTP for it. */
export default function LoginRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  // Where the chain ends: whatever the user tapped that needed an account (F-19).
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const phone = useSessionStore((s) => s.phone);
  const setPhone = useSessionStore((s) => s.setPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The banner is not a state the user has to dismiss; it goes on its own.
  const shownError = useAutoDismiss(error);

  const submit = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      // The request id is the OTP screen's handle on this attempt. It lives in memory only, so
      // it never reaches the web URL, the history stack or a shared link.
      const { request_id } = await getApi().requestOtp({ phone: next });
      setOtpRequestId(request_id);
      setPhone(next);
      router.push(withReturnTo('/(auth)/otp', returnTo));
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
    />
  );
}
