import { colors } from '@tslprb/design-tokens';
import { useDir } from '@tslprb/i18n';
import { Stack } from 'expo-router';

/** Sign-in stack. Pushes travel with the reading direction (from the left under RTL, dormant). */
export default function AuthLayout() {
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
