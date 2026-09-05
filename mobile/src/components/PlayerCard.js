import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import { resolveMediaUrl } from '../api/client';
import { formatDateMedium, initials } from '../lib/format';
import Txt from './Txt';

const POSITION_LABEL = {
  GOALKEEPER: 'Kiper',
  DEFENDER: 'Bek',
  MIDFIELDER: 'Gelandang',
  FORWARD: 'Penyerang',
};

export const positionLabel = (position) => POSITION_LABEL[position] || position || 'Pemain';

/** Player card — information only (`/api/players`). No selection behaviour. */
export function PlayerCard({ player, onPress, variant = 'tile', testID }) {
  const photo = resolveMediaUrl(player.photo || player.photo_url);
  const name = player.display_name || player.full_name || 'Pemain';

  if (variant === 'row') {
    return (
      <Pressable
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.rowPhoto} contentFit="cover" transition={180} />
        ) : (
          <View style={[styles.rowPhoto, styles.fallback]}>
            <Txt variant="h3" tone="accent">
              {initials(name)}
            </Txt>
          </View>
        )}
        <View style={styles.rowBody}>
          <Txt variant="smallStrong" numberOfLines={1}>
            {name}
          </Txt>
          <Txt variant="meta" tone="muted" numberOfLines={1}>
            {positionLabel(player.position)}
            {player.nationality ? ` · ${player.nationality}` : ''}
          </Txt>
        </View>
        {player.jersey_number !== null && player.jersey_number !== undefined ? (
          <View style={styles.number}>
            <Txt variant="smallStrong" tone="onAccent">
              {player.jersey_number}
            </Txt>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}
    >
      <View style={styles.tilePhotoWrap}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.tilePhoto} contentFit="cover" transition={180} />
        ) : (
          <LinearGradient colors={[colors.navy, colors.navyDeep]} style={[styles.tilePhoto, styles.fallback]}>
            <Txt variant="display" tone="accent">
              {initials(name)}
            </Txt>
          </LinearGradient>
        )}
        <LinearGradient colors={['transparent', 'rgba(12,21,51,0.95)']} style={styles.tileFade} />
        {player.jersey_number !== null && player.jersey_number !== undefined ? (
          <View style={styles.tileNumber}>
            <Txt variant="smallStrong" tone="onAccent">
              {player.jersey_number}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.tileBody}>
        <Txt variant="smallStrong" numberOfLines={1}>
          {name}
        </Txt>
        <Txt variant="meta" tone="muted" numberOfLines={1}>
          {positionLabel(player.position)}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Album card — `/api/gallery/public/albums`. */
export function AlbumCard({ album, onPress, width, testID }) {
  const cover = resolveMediaUrl(album.cover_url);
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.album, width ? { width } : null, pressed ? styles.pressed : null]}
    >
      {cover ? (
        <Image source={{ uri: cover }} style={styles.albumCover} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient colors={[colors.navy, colors.navyDeep]} style={[styles.albumCover, styles.fallback]}>
          <Ionicons name="images-outline" size={24} color={colors.accent} />
        </LinearGradient>
      )}
      <LinearGradient colors={['transparent', 'rgba(12,21,51,0.95)']} style={styles.albumFade} />
      <View style={styles.albumBody}>
        <Txt variant="smallStrong" numberOfLines={2}>
          {album.title}
        </Txt>
        <Txt variant="meta" tone="dim" numberOfLines={1}>
          {[
            album.media_count ? `${album.media_count} media` : null,
            formatDateMedium(album.date || album.published_at),
          ]
            .filter(Boolean)
            .join(' · ')}
        </Txt>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: radii.card,
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPhoto: { width: 52, height: 52, borderRadius: radii.pill },
  rowBody: { flex: 1, gap: 2 },
  number: {
    minWidth: 30,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tile: {
    flex: 1,
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tilePhotoWrap: { position: 'relative' },
  tilePhoto: { width: '100%', height: 150 },
  tileFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
  tileNumber: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 26,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
    alignItems: 'center',
  },
  tileBody: { padding: 10, gap: 2 },
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  album: {
    borderRadius: radii.card,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
  },
  albumCover: { width: '100%', height: 130 },
  albumFade: { position: 'absolute', left: 0, right: 0, bottom: 52, height: 60 },
  albumBody: { padding: 10, gap: 2 },
  pressed: { opacity: 0.9 },
});

export default PlayerCard;
