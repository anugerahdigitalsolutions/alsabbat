import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Txt from './Txt';

/** Native top bar for detail screens (back + title + optional action). */
export function TopBar({ title, onBack, right, subtitle, testID }) {
  return (
    <View style={styles.bar} testID={testID}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <View style={styles.titleWrap}>
        <Txt variant="h3" numberOfLines={1} style={styles.center}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt variant="meta" tone="muted" numberOfLines={1} style={styles.center}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right || <View style={styles.spacer} />}
    </View>
  );
}

export function SectionHeader({ title, actionLabel, onAction, style, testID }) {
  return (
    <View style={[styles.section, style]} testID={testID}>
      <View style={styles.sectionTitle}>
        <View style={styles.accentBar} />
        <Txt variant="h2" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={styles.sectionAction}>
          <Txt variant="meta" tone="accent">
            {actionLabel || 'Lihat semua'}
          </Txt>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: gutter,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { width: 38, height: 38 },
  titleWrap: { flex: 1, alignItems: 'center' },
  center: { textAlign: 'center' },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 9 },
  accentBar: { width: 3, height: 18, borderRadius: 2, backgroundColor: colors.accent },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});

export default TopBar;
