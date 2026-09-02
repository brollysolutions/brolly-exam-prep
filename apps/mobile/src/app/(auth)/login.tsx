import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getApi } from '@/data/api';
import { useSessionStore } from '@/data/session';
import { LoginView } from '@/features/auth/LoginView';

/** F-03 — asks for the phone number and requests the OTP for it. */
export default function LoginRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const phone = useSessionStore((s) => s.phone);
  const setPhone = useSessionStore((s) => s.setPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (next: string) => {
    setBusy(true);
    setError(null);
    try {
      // The request id is the OTP screen's handle on this attempt; it never outlives the flow.
      const { request_id } = await getApi().requestOtp({ phone: next });
      setPhone(next);
      router.push({ pathname: '/(auth)/otp', params: { requestId: request_id } });
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
      error={error}
      onSubmit={(next) => {
        void submit(next);
      }}
    />
  );
}
