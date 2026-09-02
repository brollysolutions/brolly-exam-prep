import '../global.css';

import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_700Bold,
} from '@expo-google-fonts/noto-nastaliq-urdu';
import {
  NotoSansTelugu_400Regular,
  NotoSansTelugu_500Medium,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold,
} from '@expo-google-fonts/noto-sans-telugu';
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

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// The language store hydrates synchronously from kv-store, so i18n boots in the stored language —
// unless the web screenshot tooling asked for one with `?lang=`, which wins for this load.
const override = webLangOverride();
initI18n(override ?? useLangStore.getState().lang);
// After init, so `changeLanguage` has services to work with. Keeps the store in step with i18n,
// so a language-aware screen shows the override as the selected chip.
if (override) useLangStore.getState().setLang(override);

/** Keys must equal `tokens.json → font.<lang>.weights` — `useTypography()` resolves families by these names. */
const FONTS = {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  NotoSansTelugu_400Regular,
  NotoSansTelugu_500Medium,
  NotoSansTelugu_600SemiBold,
  NotoSansTelugu_700Bold,
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_700Bold,
};

export default function RootLayout() {
  const [loaded, error] = useFonts(FONTS);
  const ready = loaded || !!error;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.ink }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.tar } }}
          />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
