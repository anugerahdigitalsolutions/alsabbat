import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radii, shadow } from '../theme';
import Txt from './Txt';

export function Card({ children, style, onPress, padded = true, testID }) {
  const content = (
    <View style={[styles.card, padded ? styles.padded : null, shadow.card, style]}>{children}</View>
  );
  if (!onPress) return React.cloneElement(content, { testID });
  return (
    <Pressable onPress={onPress} testID={testID} style={({ pressed }) => (pressed ? styles.pressed : null)}>
      {content}
    </Pressable>
  );
}

export function Badge({ label, tone = 'default', style, testID }) {
  const toneStyle =
    tone === 'accent'
      ? styles.badgeAccent
      : tone === 'live'
        ? styles.badgeLive
        : tone === 'win'
          ? styles.badgeWin
          : tone === 'lose'
            ? styles.badgeLose
            : styles.badgeDefault;
  const textTone =
    tone === 'accent' ? 'accent' : tone === 'live' ? 'live' : tone === 'win' ? 'win' : tone === 'lose' ? 'lose' : 'muted';
  return (
    <View style={[styles.badge, toneStyle, style]} testID={testID}>
      {tone === 'live' ? <View style={styles.dot} /> : null}
      <Txt variant="meta" tone={textTone}>
        {label}
      </Txt>
    </View>
  );
}

export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSolid,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  padded: { padding: 14 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  badgeDefault: { backgroundColor: colors.surface2, borderColor: colors.border },
  badgeAccent: { backgroundColor: colors.accentSoft, borderColor: 'rgba(252,207,43,0.35)' },
  badgeLive: { backgroundColor: 'rgba(239,68,68,0.16)', borderColor: 'rgba(239,68,68,0.4)' },
  badgeWin: { backgroundColor: 'rgba(34,197,94,0.16)', borderColor: 'rgba(34,197,94,0.4)' },
  badgeLose: { backgroundColor: 'rgba(248,113,113,0.16)', borderColor: 'rgba(248,113,113,0.4)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.live, marginRight: 6 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
});

export default Card;
