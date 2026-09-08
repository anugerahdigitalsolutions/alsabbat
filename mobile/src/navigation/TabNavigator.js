import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, shadow } from '../theme';
import Txt from '../components/Txt';
import HomeScreen from '../screens/HomeScreen';
import StoreScreen from '../screens/StoreScreen';
import MatchesScreen from '../screens/MatchesScreen';
import NewsScreen from '../screens/NewsScreen';
import MediaScreen from '../screens/MediaScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Tab = createBottomTabNavigator();

const TABS = {
  Home: { label: 'HOME', icon: 'home', iconOutline: 'home-outline' },
  Match: { label: 'MATCH', icon: 'football', iconOutline: 'football-outline' },
  News: { label: 'NEWS', icon: 'newspaper', iconOutline: 'newspaper-outline' },
  Media: { label: 'MEDIA', icon: 'images', iconOutline: 'images-outline' },
  Store: { label: 'TOKO', icon: 'bag-handle', iconOutline: 'bag-handle-outline' },
  Profile: { label: 'PROFILE', icon: 'person', iconOutline: 'person-outline' },
};

/** Native floating bottom navigation — AL SABBAT navy bar with gold active pill. */
function ClubTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const { unreadCount } = useAuth();
  const { count: cartCount } = useCart();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={[styles.bar, shadow.nav]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TABS[route.name] || { label: route.name, icon: 'ellipse', iconOutline: 'ellipse-outline' };
          const badge =
            (route.name === 'Profile' && unreadCount > 0) ||
            (route.name === 'Store' && cartCount > 0);
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              testID={`tab-${route.name.toLowerCase()}`}
              onPress={() => {
                if (!focused) navigation.navigate(route.name);
              }}
              style={styles.tab}
            >
              <View style={[styles.iconWrap, focused ? styles.iconWrapActive : null]}>
                <Ionicons
                  name={focused ? meta.icon : meta.iconOutline}
                  size={20}
                  color={focused ? colors.onAccent : colors.textMuted}
                />
                {badge ? <View style={styles.badge} /> : null}
              </View>
              <Txt
                variant="label"
                tone={focused ? 'accent' : 'dim'}
                numberOfLines={1}
                style={styles.tabLabel}
              >
                {meta.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
        animation: Platform.OS === 'android' ? 'shift' : 'fade',
      }}
      tabBar={(props) => <ClubTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Match" component={MatchesScreen} />
      <Tab.Screen name="News" component={NewsScreen} />
      <Tab.Screen name="Media" component={MediaScreen} />
      <Tab.Screen name="Store" component={StoreScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 2, minWidth: 0 },
  // 6 tab harus tetap utuh pada layar 320px (tanpa teks terpotong).
  tabLabel: { letterSpacing: 0.2, textAlign: 'center', width: '100%' },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.accent },
  badge: {
    position: 'absolute',
    top: 2,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
    borderWidth: 1,
    borderColor: colors.surfaceSolid,
  },
});
