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
  ActionBar,
  BackRow,
  Button,
  cx,
  haptics,
  Keypad,
  Num,
  OtpCells,
  PageHeader,
  Pill,
  pressedClass,
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
  /**
   * The code a test build hands back with the request (mock API, API in `OTP_DEV_MODE`). Shows a
   * hint and a one-tap fill; production sends an SMS instead and leaves this undefined.
   */
  devCode?: string;
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
  devCode,
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
      // The `ActionBar` at the foot owns the bottom inset, the way the tab bar does (I1).
      bottomInset={false}
      overlay={error ? <Toast testID="otp-error" text={error} tone="danger" /> : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackRow
          testID="otp-change-number"
          label={t('auth.changeNumber')}
          onPress={onChangeNumber}
        />

        <PageHeader title={t('auth.otpTitle')} testID="otp-header" />
        {/* One sentence, not two fragments: Telugu puts the number before the postposition. */}
        <Text testID="otp-phone" variant="body" color="ink3" className="mt-2">
          <Trans
            i18nKey="auth.otpSub"
            values={{ phone: formatPhone(phone, t('auth.countryCode')) }}
            components={{ num: <Num variant="body" weight="600" color="ink" /> }}
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

        {/* No ring in front of it: a hollow circle beside a line of text reads as an
            unchecked radio button nobody can check (design review D9). */}
        <Text variant="caption" color="ink3" className="mt-4">
          {t('auth.otpAuto')}
        </Text>

        {devCode ? <DevCode code={devCode} onUse={() => setCode(digitsOnly(devCode))} /> : null}

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

      {/* The keypad and the one ink action ride the same bar, so the decision never scrolls
          away from the cells it is about. */}
      <ActionBar
        testID="otp-bar"
        primary={
          <Button
            testID="otp-verify"
            size="lg"
            label={t('auth.verify')}
            disabled={!ready}
            onPress={() => {
              void verify();
            }}
          />
        }
      >
        <Keypad onKey={append} onDelete={remove} testID="otp-keypad" />
      </ActionBar>
    </Screen>
  );
}

type DevCodeProps = {
  code: string;
  onUse: () => void;
};

/**
 * The test-build hint under the cells: the code the API returned and a quiet button that puts
 * it in the cells, so the only yellow on the screen stays on Verify. Never rendered when the
 * code came by SMS.
 */
function DevCode({ code, onUse }: DevCodeProps) {
  const { t } = useTranslation();
  const { pressed, handlers } = usePressed();
  return (
    <View className="mt-3">
      <Pill
        testID="otp-dev-code"
        label={
          <Trans
            i18nKey="auth.devCodeHint"
            values={{ code }}
            components={{ num: <Num variant="caption" weight="700" color="ink3" /> }}
          />
        }
      />
      <Pressable
        testID="otp-use-dev-code"
        accessibilityRole="button"
        android_ripple={{ color: colors.accentTint }}
        onPress={onUse}
        {...handlers}
        // Pressed = a `surface2` fill: an opacity dim is invisible between two creams.
        // `self-start`: stretched, the 48 px target ran the width of the screen and a tap
        // anywhere on that band fired it (design review D10).
        className={cx('mt-1 min-h-touch justify-center self-start px-1', pressed && pressedClass)}
      >
        <Text variant="small" weight="600" color="ink2">
          {t('auth.useDevCode')}
        </Text>
      </Pressable>
    </View>
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
      <View testID="otp-resend-line" className="mt-2 min-h-touch justify-center self-start px-1">
        <Text variant="small" color="ink3">
          <Trans
            i18nKey="auth.resendIn"
            values={{ seconds: remainingSec }}
            components={{ num: <Num variant="small" weight="400" color="ink3" /> }}
          />
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      testID="otp-resend"
      accessibilityRole="button"
      android_ripple={{ color: colors.accentTint }}
      onPress={() => {
        // A resend always costs the full wait, whatever the clock was opened with.
        setEndsAt(Date.now() + RESEND_SECONDS * 1000);
        setTicking(true);
        onResend();
      }}
      {...handlers}
      // Pressed = a `surface2` fill: an opacity dim is invisible between two creams.
      // `self-start`: stretched, the 48 px target ran the width of the screen (D10).
      className={cx('mt-2 min-h-touch justify-center self-start px-1', pressed && pressedClass)}
    >
      {/* Ink, not gold: gold is a fill on cream, so the link carries a gold dot instead of
          gold letters. */}
      <Row gap={2} align="center">
        <View className="h-1.5 w-1.5 rounded-full bg-accentStrong" />
        <Text variant="small" weight="600">
          {t('auth.resend')}
        </Text>
      </Row>
    </Pressable>
  );
}
