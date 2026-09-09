import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, font, gradients, radii, shadow } from '../theme';
import Txt from './Txt';

/** Gold gradient primary action — the club CTA style. */
export function PrimaryButton({ label, onPress, loading, disabled, icon, style, testID }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.wrap,
        styles.wrapAccent,
        shadow.accent,
        style,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
        {loading ? (
          <ActivityIndicator color={colors.onAccent} size="small" />
        ) : (
          <View style={styles.row}>
            {icon ? <Ionicons name={icon} size={17} color={colors.onAccent} style={styles.icon} /> : null}
            <Txt variant="title" tone="onAccent">
              {label}
            </Txt>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

/** Outlined / translucent secondary action. */
export function GhostButton({ label, onPress, icon, loading, disabled, style, testID, tone = 'default' }) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      testID={testID}
      style={({ pressed }) => [
        styles.wrap,
        styles.ghost,
        style,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <View style={[styles.fill, styles.row]}>
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <>
            {icon ? (
              <Ionicons
                name={icon}
                size={17}
                color={tone === 'danger' ? colors.lose : colors.text}
                style={styles.icon}
              />
            ) : null}
            <Txt variant="title" tone={tone === 'danger' ? 'lose' : 'default'}>
              {label}
            </Txt>
          </>
        )}
      </View>
    </Pressable>
  );
}

/** Small text-only link button. */
export function LinkButton({ label, onPress, style, testID, tone = 'accent' }) {
  return (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => [style, pressed ? styles.pressed : null]}>
      <Txt variant="smallStrong" tone={tone} style={styles.link}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.pill, overflow: 'hidden' },
  // Latar solid membuat outline (dan clipping radius) Android mengikuti bentuk
  // pill seperti di iOS, bukan kotak view.
  wrapAccent: { backgroundColor: colors.accentTo },
  fill: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  icon: { marginRight: 8 },
  ghost: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface2,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.55 },
  link: { fontFamily: font.semibold },
});

export default PrimaryButton;
