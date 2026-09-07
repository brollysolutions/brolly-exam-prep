import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { Stack } from 'expo-router';

/** Onboarding stack (post → category). Pushes travel with the reading direction. */
export default function OnboardingLayout() {
  const d = useDir();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.canvas },
        animation: d.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    />
  );
}
