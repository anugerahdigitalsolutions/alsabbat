import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { hasSeenOnboarding } from '../lib/onboardingStore';
import TabNavigator from './TabNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import OtpScreen from '../screens/OtpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import MatchDetailScreen from '../screens/MatchDetailScreen';
import NewsDetailScreen from '../screens/NewsDetailScreen';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import SquadScreen from '../screens/SquadScreen';
import PlayerDetailScreen from '../screens/PlayerDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MemberCardScreen from '../screens/MemberCardScreen';
import ClubInfoScreen from '../screens/ClubInfoScreen';

const Stack = createNativeStackNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.surfaceSolid,
    text: colors.text,
    primary: colors.accent,
    border: colors.border,
  },
};

export default function RootNavigator({ onReady }) {
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const seen = await hasSeenOnboarding();
      if (alive) setInitialRoute(seen ? 'Main' : 'Onboarding');
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!initialRoute) return null;

  return (
    <NavigationContainer theme={navTheme} onReady={onReady}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Main" component={TabNavigator} options={{ animation: 'fade' }} />

        {/* auth (existing Baraya/customer endpoints) */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />

        {/* detail screens */}
        <Stack.Screen name="MatchDetail" component={MatchDetailScreen} />
        <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
        <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
        <Stack.Screen name="Squad" component={SquadScreen} />
        <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="MemberCard" component={MemberCardScreen} />
        <Stack.Screen name="ClubInfo" component={ClubInfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
