import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { colors, gradients, radii } from '../theme';
import Txt from '../components/Txt';
import { GhostButton } from '../components/Buttons';
import { MAINTENANCE_TITLE } from '../lib/maintenance';

const LOGO = require('../../assets/logo.png');

/**
 * Layar Maintenance Mode global. Status berasal dari backend existing
 * (`GET /api/system/maintenance`) — dirender menggantikan seluruh aplikasi,
 * TANPA navigasi/redirect sehingga tidak mungkin terjadi redirect loop.
 */
export default function MaintenanceScreen({ message, onRetry, busy }) {
  return (
    <View style={styles.flex} testID="maintenance-screen">
      <StatusBar style="light" />
      <LinearGradient colors={gradients.navy} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.content}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <Txt variant="display" tone="accent" style={styles.title}>
            {MAINTENANCE_TITLE}
          </Txt>
          <View style={styles.card}>
            <Txt variant="body" tone="white" style={styles.text}>
              {message ||
                'Aplikasi AL SABBAT sedang dalam pemeliharaan sistem. Silakan kembali beberapa saat lagi.'}
            </Txt>
          </View>
          <GhostButton
            label="Muat ulang status"
            icon="refresh-outline"
            onPress={onRetry}
            loading={busy}
            style={styles.button}
            testID="maintenance-retry"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  logo: { width: 108, height: 108 },
  title: { textAlign: 'center', letterSpacing: 0.4 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 16,
    width: '100%',
  },
  text: { textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: 4, borderColor: colors.borderStrong },
});
