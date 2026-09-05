import { colors } from '@tslprb/design-tokens';
import { useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useCountdown } from '@/data/useCountdown';
import {
  BackRow,
  Button,
  haptics,
  Keypad,
  Num,
  OtpCells,
  Row,
  Screen,
  Text,
  Toast,
  usePressed,
  useReducedMotionSafe,
} from '@/ui';

/** The SMS code is six digits. */
const OTP_LENGTH = 6;
/** Seconds a resend costs, every time (prototype value). */
const RESEND_SECONDS = 24;

/** Three shakes of 6 px in 240 ms — six 40 ms legs. */
const SHAKE_PX = 6;
const SHAKE_LEG_MS = 40;

/** Shown while the number is unknown, so the line never collapses (prototype). */
const PHONE_MASK = '00000 00000';

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

/** `+91 90000 12345` — the grouping the SMS itself uses. */
const formatPhone = (phone: string, code: string) => {
  const digits = phone.replace(/\D/g, '');
  const grouped =
    digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits || PHONE_MASK;
  return `${code} ${grouped}`;
};

export type OtpViewProps = {
  /** The number the code was sent to. */
  phone: string;
  initialCode?: string;
  busy?: boolean;
  /** Seconds on the resend clock. 0 arms resend at once (an expired request, the dev gallery). */
  resendSeconds?: number;
  /** Message for the error toast; `null`/omitted hides it. */
  error?: string | null;
  /** Resolve `false` for a wrong code: the cells shake, clear and buzz. */
  onVerify: (code: string) => boolean | Promise<boolean>;
  onResend: () => void;
  onChangeNumber: () => void;
};

/**
 * Step 2 of sign-in. The cells are display-only — digits come from the app keypad or, where the
 * OS offers it, from the hidden `oneTimeCode` input that SMS autofill can reach.
 */
export function OtpView({
  phone,
  initialCode = '',
  busy = false,
  resendSeconds = RESEND_SECONDS,
  error,
  onVerify,
  onResend,
  onChangeNumber,
}: OtpViewProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotionSafe();
  const hidden = useRef<TextInput>(null);
  const [code, setCode] = useState(() => digitsOnly(initialCode));

  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const ready = code.length === OTP_LENGTH && !busy;

  const append = useCallback(
    (key: string) => setCode((c) => (c.length < OTP_LENGTH ? c + key : c)),
    [],
  );
  const remove = useCallback(() => setCode((c) => c.slice(0, -1)), []);

  const reject = useCallback(() => {
    haptics.warning();
    setCode('');
    if (reduced) return;
    shake.set(
      withSequence(
        withTiming(-SHAKE_PX, { duration: SHAKE_LEG_MS }),
        withTiming(SHAKE_PX, { duration: SHAKE_LEG_MS }),
        withTiming(-SHAKE_PX, { duration: SHAKE_LEG_MS }),
        withTiming(SHAKE_PX, { duration: SHAKE_LEG_MS }),
        withTiming(-SHAKE_PX, { duration: SHAKE_LEG_MS }),
        withTiming(0, { duration: SHAKE_LEG_MS }),
      ),
    );
  }, [reduced, shake]);

  const verify = useCallback(async () => {
    const ok = await onVerify(code);
    if (ok) haptics.success();
    else reject();
  }, [code, onVerify, reject]);

  const resend = useCallback(() => {
    setCode('');
    onResend();
  }, [onResend]);

  return (
    <Screen
      testID="otp-screen"
      overlay={error ? <Toast testID="otp-error" text={error} tone="flag" /> : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-2 pt-5"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackRow
          testID="otp-change-number"
          label={t('auth.changeNumber')}
          onPress={onChangeNumber}
        />

        <Text variant="titleLg" weight="600" className="mt-2">
          {t('auth.otpTitle')}
        </Text>
        {/* One sentence, not two fragments: Telugu puts the number before the postposition. */}
        <Text testID="otp-phone" variant="body" color="dim" className="mt-2">
          <Trans
            i18nKey="auth.otpSub"
            values={{ phone: formatPhone(phone, t('auth.countryCode')) }}
            components={{ num: <Num variant="body" weight="600" color="chalk" /> }}
          />
        </Text>

        {/* NativeWind does not style Animated.View, so spacing lives on the wrapper and the
            animated layer carries nothing but the shake transform. */}
        <View className="mt-6">
          <Animated.View style={shakeStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.otpTitle')}
              accessibilityValue={{ text: code }}
              accessibilityHint={t('auth.autofillHint')}
              onLongPress={() => hidden.current?.focus()}
            >
              <OtpCells value={code} length={OTP_LENGTH} testID="otp-cells" />
            </Pressable>
          </Animated.View>
        </View>

        <Row gap={2} align="center" className="mt-4">
          <View className="border-1.5 h-dot w-dot rounded-full border-dim" />
          <Text variant="caption" color="dim" className="flex-1">
            {t('auth.otpAuto')}
          </Text>
        </Row>

        {/* Remounted whenever the caller changes the clock, which re-arms it from the new value. */}
        <Resend key={resendSeconds} seconds={resendSeconds} onResend={resend} />

        {/* Off-screen but focusable, so the OS can drop an SMS code straight in. */}
        <View className="h-px overflow-hidden">
          <TextInput
            ref={hidden}
            testID="otp-autofill"
            value={code}
            onChangeText={(next) => setCode(digitsOnly(next))}
            keyboardType="number-pad"
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            maxLength={OTP_LENGTH}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="h-px w-px opacity-0"
          />
        </View>
      </ScrollView>

      <View className="px-3 pb-4 pt-2">
        <Keypad onKey={append} onDelete={remove} testID="otp-keypad" />
        <Button
          testID="otp-verify"
          size="lg"
          label={t('auth.verify')}
          disabled={!ready}
          onPress={() => {
            void verify();
          }}
          className="mt-3"
        />
      </View>
    </Screen>
  );
}

type ResendProps = {
  /** Seconds to wait before the link wakes up. */
  seconds: number;
  onResend: () => void;
};

/**
 * The line under the cells: a countdown that becomes a link at zero. Both states are the same
 * height, so nothing on the screen jumps when it flips. The deadline is state, never a counter,
 * and it is re-derived by remounting (see the `key` above) rather than in an effect.
 */
function Resend({ seconds, onResend }: ResendProps) {
  const { t } = useTranslation();
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000);
  const [ticking, setTicking] = useState(seconds > 0);
  const { remainingSec } = useCountdown({ endsAt, enabled: ticking });
  const { pressed, handlers } = usePressed();
  // Nothing left to tick: the interval stops instead of running for the rest of the session.
  if (ticking && remainingSec <= 0) setTicking(false);

  if (remainingSec > 0) {
    return (
      <View testID="otp-resend-line" className="mt-2 min-h-touch justify-center">
        <Text variant="small" color="sand">
          <Trans
            i18nKey="auth.resendIn"
            values={{ seconds: remainingSec }}
            components={{ num: <Num variant="small" weight="400" color="sand" /> }}
          />
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      testID="otp-resend"
      accessibilityRole="button"
      android_ripple={{ color: colors.hivisTint3 }}
      onPress={() => {
        // A resend always costs the full wait, whatever the clock was opened with.
        setEndsAt(Date.now() + RESEND_SECONDS * 1000);
        setTicking(true);
        onResend();
      }}
      {...handlers}
      className="mt-2 min-h-touch justify-center"
      // One flattened object, never a callback: see `usePressed`.
      style={pressed ? { opacity: 0.8 } : undefined}
    >
      <Text variant="small" weight="600" color="sand">
        {t('auth.resend')}
      </Text>
    </Pressable>
  );
}
