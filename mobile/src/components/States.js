import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Txt from './Txt';
import { PrimaryButton } from './Buttons';

/** Skeleton block list while the API request is in flight. */
export function Loading({ rows = 3, height = 96, testID }) {
  return (
    <View testID={testID}>
      {Array.from({ length: rows }).map((_, index) => (
        <View key={index} style={[styles.skeleton, { height }]} />
      ))}
    </View>
  );
}

export function Spinner({ style }) {
  return (
    <View style={[styles.center, style]}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function ErrorState({ message, onRetry, testID }) {
  return (
    <View style={styles.state} testID={testID}>
      <View style={styles.iconWrap}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.accent} />
      </View>
      <Txt variant="h3" style={styles.stateTitle}>
        Gagal memuat
      </Txt>
      <Txt variant="small" tone="muted" style={styles.stateText}>
        {message || 'Terjadi kendala saat menghubungi server AL SABBAT.'}
      </Txt>
      {onRetry ? <PrimaryButton label="Coba lagi" onPress={onRetry} style={styles.stateButton} /> : null}
    </View>
  );
}

export function EmptyState({ icon = 'sparkles-outline', title, description, testID, action }) {
  return (
    <View style={styles.state} testID={testID}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      <Txt variant="h3" style={styles.stateTitle}>
        {title || 'Belum ada data'}
      </Txt>
      {description ? (
        <Txt variant="small" tone="muted" style={styles.stateText}>
          {description}
        </Txt>
      ) : null}
      {action}
    </View>
  );
}

/** Gallery/Media is limited to PEMAIN & STAFF — enforced by the backend too. */
export function RestrictedNotice({ feature = 'Fitur ini', onAction, actionLabel, testID }) {
  return (
    <View style={styles.state} testID={testID}>
      <View style={styles.iconWrap}>
        <Ionicons name="lock-closed-outline" size={26} color={colors.accent} />
      </View>
      <Txt variant="h3" style={styles.stateTitle}>
        {feature} terbatas
      </Txt>
      <Txt variant="small" tone="muted" style={styles.stateText}>
        Akses hanya untuk Pemain dan Staf AL SABBAT. Status peran Anda diatur oleh pengurus klub.
      </Txt>
      {onAction ? (
        <PrimaryButton label={actionLabel || 'Masuk'} onPress={onAction} style={styles.stateButton} />
      ) : null}
    </View>
  );
}

/** Horizontal filter chips (competition / category / season). */
export function ChipRow({ options = [], value, onChange, testID }) {
  if (options.length <= 1) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.chipRow}
      testID={testID}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value ?? option.label}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            <Txt variant="smallStrong" tone={active ? 'onAccent' : 'muted'}>
              {option.label}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  center: { paddingVertical: 26, alignItems: 'center' },
  state: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: { textAlign: 'center' },
  stateText: { textAlign: 'center', marginTop: 6 },
  stateButton: { marginTop: 16, alignSelf: 'stretch' },
  chipRow: { paddingHorizontal: gutter, gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
});

export default Loading;
