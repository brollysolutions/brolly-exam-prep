import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError, getApi } from '@/data/api';
import { useSessionStore } from '@/data/session';
import { OtpView } from '@/features/auth/OtpView';

/** F-04 — verifies the SMS code and turns it into a session token. */
export default function OtpRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const phone = useSessionStore((s) => s.phone) ?? '';
  const setToken = useSessionStore((s) => s.setToken);
  const [requestId, setRequestId] = useState(params.requestId ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (code: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await getApi().verifyOtp({ request_id: requestId, code });
      setToken(token);
      router.replace('/(onboarding)/post');
      return true;
    } catch (cause) {
      // 4xx is the code being wrong (or expired) — the view shakes and clears. Anything else
      // is the connection, which needs saying out loud.
      const rejected = cause instanceof ApiError && cause.status >= 400 && cause.status < 500;
      if (!rejected) setError(t('common.networkError'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const { request_id } = await getApi().requestOtp({ phone });
      setRequestId(request_id);
    } catch {
      setError(t('common.networkError'));
    }
  };

  return (
    <OtpView
      phone={phone}
      busy={busy}
      error={error}
      onVerify={verify}
      onResend={() => {
        void resend();
      }}
      onChangeNumber={() => router.back()}
    />
  );
}
