import React, { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../theme';
import Txt from '../components/Txt';

const LOGO = require('../../assets/logo.png');

/**
 * Branded splash shown on top of the native Expo splash while fonts, club
 * identity and the session are being restored.
 */
export default function SplashScreenView() {
  const [fade] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.9));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, scale]);

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[colors.navy, colors.navyDeep, colors.bg]} style={StyleSheet.absoluteFill} />
      <Animated.View style={{ opacity: fade, transform: [{ scale }] }}>
        <Image source={LOGO} style={styles.logo} contentFit="contain" />
      </Animated.View>
      <Animated.View style={{ opacity: fade }}>
        <Txt variant="label" tone="accent" style={styles.caption}>
          AL SABBAT FOOTBALL CLUB
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  logo: { width: 176, height: 176 },
  caption: { marginTop: 18, textAlign: 'center', letterSpacing: 1.6 },
});
