import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import Txt from './Txt';

/**
 * Persetujuan Syarat & Ketentuan sebelum pembuatan akun.
 * Default TIDAK tercentang; teks "Syarat & Ketentuan" & "Kebijakan Privasi"
 * dapat ditekan untuk membuka dokumennya di dalam aplikasi.
 */
export default function TermsCheckbox({ value, onChange, onOpenTerms, onOpenPrivacy, testID }) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => onChange(!value)}
        hitSlop={8}
        style={styles.box}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(value) }}
        testID={testID}
      >
        <View style={[styles.check, value ? styles.checked : null]}>
          {value ? <Ionicons name="checkmark" size={13} color={colors.onAccent} /> : null}
        </View>
      </Pressable>
      <View style={styles.text}>
        <Txt variant="small">
          Saya menyetujui{' '}
          <Txt variant="smallStrong" tone="accent" onPress={onOpenTerms} testID="register-terms-link">
            Syarat &amp; Ketentuan
          </Txt>{' '}
          AL SABBAT.
        </Txt>
        <Txt variant="meta" tone="muted" style={styles.privacy}>
          Baca juga{' '}
          <Txt variant="meta" tone="accent" onPress={onOpenPrivacy} testID="register-privacy-link">
            Kebijakan Privasi
          </Txt>
          .
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 4, marginBottom: 14 },
  box: { paddingTop: 1 },
  check: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.accent, borderColor: colors.accent },
  text: { flex: 1 },
  privacy: { marginTop: 3 },
});
