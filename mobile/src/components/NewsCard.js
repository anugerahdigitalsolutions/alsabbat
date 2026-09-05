import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadow } from '../theme';
import { resolveMediaUrl } from '../api/client';
import { formatDateMedium, relativeTime, stripHtml } from '../lib/format';
import Txt from './Txt';

/** News card — `/api/content/posts` payload only (title, thumbnail, dates). */
export function NewsCard({ post, variant = 'row', onPress, testID }) {
  const image = resolveMediaUrl(post.thumbnail || post.cover_url || post.image_url);
  const date = post.published_at || post.created_at;

  if (variant === 'hero') {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.hero, shadow.card, pressed ? styles.pressed : null]}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.heroImage} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[colors.navy, colors.navyDeep]} style={styles.heroImage} />
        )}
        <LinearGradient
          colors={['transparent', 'rgba(4,9,26,0.5)', 'rgba(12,21,51,0.98)']}
          style={styles.heroFade}
        />
        <View style={styles.heroBody}>
          <Txt variant="h3" numberOfLines={2}>
            {post.title}
          </Txt>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={12} color={colors.textDim} />
            <Txt variant="meta" tone="dim">
              {relativeTime(date) || formatDateMedium(date)}
            </Txt>
          </View>
        </View>
      </Pressable>
    );
  }

  if (variant === 'tile') {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
      >
        {image ? (
          <Image source={{ uri: image }} style={styles.tileImage} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[colors.navy, colors.navyDeep]} style={styles.tileImage} />
        )}
        <View style={styles.tileBody}>
          <Txt variant="smallStrong" numberOfLines={2}>
            {post.title}
          </Txt>
          <Txt variant="meta" tone="dim" numberOfLines={1}>
            {relativeTime(date) || ''}
          </Txt>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      {image ? (
        <Image source={{ uri: image }} style={styles.rowImage} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient colors={[colors.navy, colors.navyDeep]} style={styles.rowImage} />
      )}
      <View style={styles.rowBody}>
        <Txt variant="smallStrong" numberOfLines={2}>
          {post.title}
        </Txt>
        {post.excerpt ? (
          <Txt variant="small" tone="muted" numberOfLines={2}>
            {stripHtml(post.excerpt)}
          </Txt>
        ) : null}
        <Txt variant="meta" tone="dim" numberOfLines={1}>
          {relativeTime(date) || formatDateMedium(date)}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: radii.card, overflow: 'hidden', backgroundColor: colors.surfaceSolid },
  heroImage: { width: '100%', height: 190 },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 },
  heroBody: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 14, gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tile: {
    width: 190,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileImage: { width: '100%', height: 106 },
  tileBody: { padding: 10, gap: 4 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowImage: { width: 96, height: 96, borderRadius: radii.sm },
  rowBody: { flex: 1, gap: 4, justifyContent: 'center' },
  pressed: { opacity: 0.9 },
});

export default NewsCard;
