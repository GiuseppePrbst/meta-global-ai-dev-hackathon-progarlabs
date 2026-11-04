import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Onboarding } from '@/features/onboarding/onboarding';
import { useOnboardingSeen } from '@/features/onboarding/onboarding-seen';
import { loadColorScheme } from '@/features/settings/color-scheme';
import { SplashOverlay } from '@/features/splash/splash-overlay';
import { fonts, useTheme } from '@/ui';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { color, scheme } = useTheme();
  const [loaded, error] = useFonts(fonts);
  const onboardingSeen = useOnboardingSeen();
  // El modo guardado se aplica antes de ocultar el splash, para no mostrar un destello claro.
  const [schemeLoaded, setSchemeLoaded] = useState(false);
  // Splash animado: releva al nativo sin corte y se retira solo al terminar (o al tocarlo).
  const [splashDone, setSplashDone] = useState(false);
  const ready = (loaded || !!error) && onboardingSeen !== undefined && schemeLoaded;

  useEffect(() => {
    loadColorScheme().then(() => setSchemeLoaded(true));
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Si la fuente falla se sigue con la del sistema: el texto nunca queda oculto.
  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: color.background }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {/* Bajo la presentación la app ya carga, pero queda fuera del lector de pantalla hasta cerrarla. */}
      <View style={{ flex: 1 }} importantForAccessibility={onboardingSeen && splashDone ? 'auto' : 'no-hide-descendants'}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.background } }} />
      </View>
      {!onboardingSeen && (
        <View style={StyleSheet.absoluteFill} importantForAccessibility={splashDone ? 'auto' : 'no-hide-descendants'}>
          <Onboarding />
        </View>
      )}
      {splashDone ? null : <SplashOverlay onDone={() => setSplashDone(true)} />}
    </GestureHandlerRootView>
  );
}
