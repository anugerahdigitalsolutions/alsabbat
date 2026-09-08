import React, { useEffect, useState } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../theme';
import { hasSeenOnboarding } from '../lib/onboardingStore';
import { useAuth } from '../context/AuthContext';
import { usePushRegistration } from '../hooks/usePushNotifications';
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
import MembershipScreen from '../screens/MembershipScreen';
import ApplicationFormScreen from '../screens/ApplicationFormScreen';
import MemberScannerScreen from '../screens/MemberScannerScreen';
import LegalScreen from '../screens/LegalScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrdersScreen from '../screens/OrdersScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderTrackScreen from '../screens/OrderTrackScreen';
import TeamsScreen from '../screens/TeamsScreen';
import TeamDetailScreen from '../screens/TeamDetailScreen';
import MaintenanceScreen from '../screens/MaintenanceScreen';
import { useMaintenance } from '../lib/maintenance';

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
  const { isAuthenticated, refreshUnread } = useAuth();
  const maintenance = useMaintenance();

  // Daftarkan token push Expo saat user login (multi-device didukung backend).
  usePushRegistration({ isAuthenticated, onNotification: refreshUnread });

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

  // Maintenance Mode global (status dari backend). Layar dirender langsung —
  // tanpa navigasi/redirect sehingga tidak mungkin terjadi redirect loop.
  if (maintenance.enabled) {
    return (
      <MaintenanceScreen
        message={maintenance.message}
        onRetry={maintenance.refresh}
        busy={maintenance.loading}
      />
    );
  }

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
        <Stack.Screen name="Teams" component={TeamsScreen} />
        <Stack.Screen name="TeamDetail" component={TeamDetailScreen} />
        <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="MemberCard" component={MemberCardScreen} />
        <Stack.Screen name="ClubInfo" component={ClubInfoScreen} />

        {/* keanggotaan: Member -> Pemain -> Staf (alur & endpoint website) */}
        <Stack.Screen name="Membership" component={MembershipScreen} />
        <Stack.Screen name="ApplicationForm" component={ApplicationFormScreen} />

        {/* toko / merchandise (API merchandise existing) */}
        <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
        <Stack.Screen name="Cart" component={CartScreen} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen name="Orders" component={OrdersScreen} />
        <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
        <Stack.Screen name="OrderTrack" component={OrderTrackScreen} />

        {/* pengaturan akun: syarat & ketentuan, kebijakan privasi, hapus akun */}
        <Stack.Screen name="Legal" component={LegalScreen} />
        <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />

        {/* verifikasi kartu member (khusus akun berperan STAF) */}
        <Stack.Screen name="MemberScanner" component={MemberScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
