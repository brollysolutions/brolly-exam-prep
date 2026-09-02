import { useDir } from '@tslprb/i18n';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useCountdown } from '@/data/useCountdown';
import {
  Button,
  haptics,
  Keypad,
  Num,
  OtpCells,
  Row,
  Screen,
  Text,
  Toast,
  useReducedMotionSafe,
} from '@/ui';

/** The SMS code is six digits. */
export const OTP_LENGTH = 6;
/** Seconds before "Resend code" wakes up (prototype value). */
export const RESEND_SECONDS = 24;

/** Three shakes of 6 px in 240 ms — six 40 ms legs. */
const SHAKE_PX = 6;
const SHAKE_LEG_MS = 40;

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, OTP_LENGTH);

/** `+91 90000 12345` — the grouping the SMS itself uses. */
const formatPhone = (phone: string, code: string) => {
  const digits = phone.replace(/\D/g, '');
  const grouped = digits.length === 10 ? `${digits.slice(0, 5)} ${digits.slice(5)}` : digits;
  return `${code} ${grouped}`;
};

export type OtpViewProps = {
  /** The number the code was sent to. */
  phone: string;
  initialCode?: string;
  busy?: boolean;
  /** Seconds on the resend clock; 0 makes resend pressable at once. */
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
  const d = useDir();
  const reduced = useReducedMotionSafe();
  const hidden = useRef<TextInput>(null);
  const [code, setCode] = useState(() => digitsOnly(initialCode));
  const [endsAt, setEndsAt] = useState(() => Date.now() + resendSeconds * 1000);
  const { remainingSec } = useCountdown({ endsAt });
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));

  const ready = code.length === OTP_LENGTH && !busy;
  const canResend = remainingSec <= 0;

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
    setEndsAt(Date.now() + resendSeconds * 1000);
    setCode('');
    onResend();
  }, [onResend, resendSeconds]);

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
        <Pressable
          testID="otp-change-number"
          accessibilityRole="button"
          onPress={onChangeNumber}
          className="h-touch justify-center"
        >
          <Row testID="otp-back-row" gap={2} align="center">
            <Text variant="glyph" color="dim" accessibilityElementsHidden>
              {d.chevronPrev}
            </Text>
            <Text variant="body" weight="600" color="dim">
              {t('auth.changeNumber')}
            </Text>
          </Row>
        </Pressable>

        <Text variant="titleLg" weight="600" className="mt-2">
          {t('auth.otpTitle')}
        </Text>
        <Row testID="otp-phone" gap={1} wrap align="baseline" className="mt-2">
          <Text variant="body" color="dim">
            {t('auth.otpSub')}
          </Text>
          <Num variant="body" weight="600" color="chalk">
            {formatPhone(phone, t('auth.countryCode'))}
          </Num>
        </Row>

        {/* NativeWind does not style Animated.View, so spacing lives on the wrapper and the
            animated layer carries nothing but the shake transform. */}
        <View className="mt-6">
          <Animated.View style={shakeStyle}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.otpTitle')}
              onLongPress={() => hidden.current?.focus()}
            >
              <OtpCells value={code} length={OTP_LENGTH} testID="otp-cells" />
            </Pressable>
          </Animated.View>
        </View>

        <Row gap={2} align="center" className="mt-4">
          <View className="border-1.5 h-dot w-dot rounded-full border-mute" />
          <Text variant="caption" color="mute" className="flex-1">
            {t('auth.otpAuto')}
          </Text>
        </Row>

        {canResend ? (
          <Pressable
            testID="otp-resend"
            accessibilityRole="button"
            onPress={resend}
            className="min-h-touch justify-center"
          >
            <Text variant="small" weight="600" color="sand">
              {t('auth.resend')}
            </Text>
          </Pressable>
        ) : (
          <Row testID="otp-resend-line" gap={1} align="baseline" className="mt-3">
            <Num variant="small" weight="400" color="sand">
              {remainingSec}
            </Num>
            <Text variant="small" color="sand">
              {t('auth.resendIn')}
            </Text>
          </Row>
        )}

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
