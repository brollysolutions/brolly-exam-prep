import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { Stack } from 'expo-router';

/** Sign-in stack. Pushes travel with the reading direction, so Urdu slides in from the left. */
export default function AuthLayout() {
  const d = useDir();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.tar },
        animation: d.isRTL ? 'slide_from_left' : 'slide_from_right',
      }}
    />
  );
}
