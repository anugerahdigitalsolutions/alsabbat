import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Txt from './Txt';

/** Quick links row — native navigation shortcuts (no web routing). */
export function QuickLinks({ items = [], testID }) {
  return (
    <View style={styles.wrap} testID={testID}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          onPress={item.onPress}
          style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={item.icon} size={20} color={colors.accent} />
          </View>
          <Txt variant="meta" tone="muted" numberOfLines={1} style={styles.label}>
            {item.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  item: { width: '23%', alignItems: 'center', gap: 6 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { textAlign: 'center' },
  pressed: { opacity: 0.75 },
});

export default QuickLinks;
