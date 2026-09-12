import '../global.css';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { NotoSansTelugu_400Regular } from '@expo-google-fonts/noto-sans-telugu/400Regular';
import { NotoSansTelugu_500Medium } from '@expo-google-fonts/noto-sans-telugu/500Medium';
import { NotoSansTelugu_600SemiBold } from '@expo-google-fonts/noto-sans-telugu/600SemiBold';
import { NotoSansTelugu_700Bold } from '@expo-google-fonts/noto-sans-telugu/700Bold';
import { NotoSansTelugu_800ExtraBold } from '@expo-google-fonts/noto-sans-telugu/800ExtraBold';
import { NotoSerifTelugu_700Bold } from '@expo-google-fonts/noto-serif-telugu/700Bold';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display/400Regular';
import { PlayfairDisplay_400Regular_Italic } from '@expo-google-fonts/playfair-display/400Regular_Italic';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { colors } from '@tslprb/design-tokens';
import { initI18n } from '@tslprb/i18n';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useLangStore } from '@/data/lang';
import { webLangOverride } from '@/data/langOverride';
import { CatalogGate } from '@/features/shell/CatalogGate';
import { StorageNotice } from '@/features/shell/StorageNotice';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// The language store hydrates synchronously from kv-store, so i18n boots in the stored language —
// unless the web screenshot tooling asked for one with `?lang=`, which wins for this load.
const override = webLangOverride();
initI18n(override ?? useLangStore.getState().lang);
// After init, so `changeLanguage` has services to work with. Keeps the store in step with i18n,
// so a language-aware screen shows the override as the selected chip.
if (override) useLangStore.getState().setLang(override);

/**
 * Keys must equal `tokens.json → font.<lang>.weights` and `font.<lang>.display.{regular,italic}` —
 * `useTypography()` resolves families by these names. Per-weight subpath imports, so the
 * bundle carries five Inter files rather than the family's eighteen (thirteen files in all).
 */
const FONTS = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  NotoSansTelugu_400Regular,
  NotoSansTelugu_500Medium,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold,
  NotoSansTelugu_800ExtraBold,
  NotoSerifTelugu_700Bold,
};

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.canvas }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="dark" />
          <StorageNotice />
          <CatalogGate>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: colors.canvas },
              }}
            />
          </CatalogGate>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
