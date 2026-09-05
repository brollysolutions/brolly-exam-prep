import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { ActionBar, BackRow, Button, Keypad, PageHeader, PhoneField, Screen, Toast } from '@/ui';

/** Indian mobile numbers are 10 digits; the keypad refuses the eleventh. */
const PHONE_LENGTH = 10;

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, PHONE_LENGTH);

export type LoginViewProps = {
  /** Digits the screen opens with (a returning user, or the dev gallery). */
  initialPhone?: string;
  /** The OTP request is in flight: the primary action is held. */
  busy?: boolean;
  /** Message for the error toast; `null`/omitted hides it. */
  error?: string | null;
  /** Called with the full 10-digit number. */
  onSubmit: (phone: string) => void;
  /**
   * Since F-19 this screen sits on top of a working app, so there has to be a way back to it.
   * Omitted when there is nothing behind it — a first run, or a deep link straight here.
   */
  onBack?: () => void;
};

/**
 * Step 1 of sign-in: a phone number typed on the app's own keypad, so the OS keyboard never
 * covers the field. The hidden `TextInput` exists only so Android/iOS autofill can still put
 * a saved number in (long-press the field to reach it).
 */
export function LoginView({
  initialPhone = '',
  busy = false,
  error,
  onSubmit,
  onBack,
}: LoginViewProps) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState(() => digitsOnly(initialPhone));
  const hidden = useRef<TextInput>(null);
  const ready = phone.length === PHONE_LENGTH && !busy;

  const append = useCallback(
    (key: string) => setPhone((p) => (p.length < PHONE_LENGTH ? p + key : p)),
    [],
  );
  const remove = useCallback(() => setPhone((p) => p.slice(0, -1)), []);

  return (
    <Screen
      testID="login-screen"
      // The `ActionBar` at the foot owns the bottom inset, the way the tab bar does (I1).
      bottomInset={false}
      overlay={error ? <Toast testID="login-error" text={error} tone="danger" /> : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-2"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {onBack && <BackRow testID="login-back" label={t('common.back')} onPress={onBack} />}
        <PageHeader
          brand
          brandTestID="login-brand"
          title={t('auth.loginTitle')}
          subtitle={t('auth.loginSub')}
          testID="login-header"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.loginTitle')}
          accessibilityValue={{ text: phone || t('auth.phoneHint') }}
          accessibilityHint={t('auth.autofillHint')}
          onLongPress={() => hidden.current?.focus()}
          className="mt-6"
        >
          <PhoneField value={phone} testID="login-phone" />
        </Pressable>
        {/* Off-screen but focusable: OS autofill needs a real input to fill. */}
        <View className="h-px overflow-hidden">
          <TextInput
            ref={hidden}
            testID="login-autofill"
            value={phone}
            onChangeText={(next) => setPhone(digitsOnly(next))}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            maxLength={PHONE_LENGTH}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            className="h-px w-px opacity-0"
          />
        </View>
      </ScrollView>
      {/* The keypad and the one ink action ride the same bar, so the decision never scrolls
          away from the digits it is about. */}
      <ActionBar
        testID="login-bar"
        primary={
          <Button
            testID="login-continue"
            size="lg"
            label={t('common.continue')}
            disabled={!ready}
            onPress={() => onSubmit(phone)}
          />
        }
      >
        <Keypad onKey={append} onDelete={remove} testID="login-keypad" />
      </ActionBar>
    </Screen>
  );
}
