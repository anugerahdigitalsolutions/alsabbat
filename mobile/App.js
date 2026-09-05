import React, { useCallback, useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';

import { AuthProvider } from './src/context/AuthContext';
import { ClubProvider } from './src/context/ClubContext';
import RootNavigator from './src/navigation/RootNavigator';
import SplashScreenView from './src/screens/SplashScreenView';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });
  const [brandSplashDone, setBrandSplashDone] = useState(false);

  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    const timer = setTimeout(() => setBrandSplashDone(true), 1500);
    return () => clearTimeout(timer);
  }, [ready]);

  const onNavigationReady = useCallback(() => {}, []);

  if (!ready || !brandSplashDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <SplashScreenView />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ClubProvider>
        <AuthProvider>
          <RootNavigator onReady={onNavigationReady} />
        </AuthProvider>
      </ClubProvider>
    </SafeAreaProvider>
  );
}
