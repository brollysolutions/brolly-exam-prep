import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ApiError, getApi } from '@/data/api';
import { withReturnTo } from '@/data/href';
import { useSessionStore } from '@/data/session';
import { getOtpDevCode, getOtpRequestId, setOtpRequestId } from '@/features/auth/otpRequest';
import { OtpView } from '@/features/auth/OtpView';
import { useAutoDismiss } from '@/ui';

/** The request is gone: nothing to verify against, so the code is not merely wrong. */
const isExpired = (cause: unknown) =>
  cause instanceof ApiError && (cause.code === 'otp_not_found' || cause.status === 404);
/** The code itself was rejected — the view shakes and clears, no words needed. */
const isWrongCode = (cause: unknown) =>
  cause instanceof ApiError && (cause.code === 'otp_invalid' || cause.status === 400);

/** F-04 — verifies the SMS code and turns it into a session token. */
export default function OtpRoute() {
  const { t } = useTranslation();
  const router = useRouter();
  // Handed on from the login screen: where the chain ends once the answers are in (F-19).
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const phone = useSessionStore((s) => s.phone) ?? '';
  const setToken = useSessionStore((s) => s.setToken);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const shownError = useAutoDismiss(error);

  const requestId = getOtpRequestId();
  // Set only by a test build (mock API, `OTP_DEV_MODE`): production leaves it undefined.
  const devCode = getOtpDevCode();

  const verify = async (code: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const { token } = await getApi().verifyOtp({ request_id: requestId ?? '', code });
      setOtpRequestId(undefined);
      setToken(token);
      router.replace(withReturnTo('/(onboarding)/post', returnTo));
      return true;
    } catch (cause) {
      if (isExpired(cause)) {
        // Nothing the keypad can fix — say so, and open the resend immediately.
        setError(t('auth.codeExpired'));
        setExpired(true);
      } else if (!isWrongCode(cause)) {
        setError(t('common.networkError'));
      }
      return false;
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      const { request_id, dev_code } = await getApi().requestOtp({ phone });
      setOtpRequestId(request_id, dev_code);
      setExpired(false);
    } catch {
      setError(t('common.networkError'));
    }
  };

  // A web reload or a deep link lands here with no request in flight: start over at the number.
  if (!requestId) return <Redirect href={withReturnTo('/(auth)/login', returnTo)} />;

  return (
    <OtpView
      phone={phone}
      devCode={devCode}
      busy={busy}
      error={shownError}
      resendSeconds={expired ? 0 : undefined}
      onVerify={verify}
      onResend={() => {
        void resend();
      }}
      onChangeNumber={() => router.back()}
    />
  );
}
