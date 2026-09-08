import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';

import { colors, radii } from '../theme';
import Txt from './Txt';
import { ImageViewer } from './ImageViewer';
import { resolveMediaUrl } from '../api/client';

/** Pemutar video produk (expo-video, kontrol native + fullscreen). */
function VideoPane({ url }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.muted = false;
  });
  return (
    <VideoView
      style={styles.media}
      player={player}
      nativeControls
      allowsFullscreen
      allowsPictureInPicture={false}
      contentFit="contain"
      testID="product-media-video"
    />
  );
}

/**
 * Galeri media produk — foto + video dalam SATU daftar campuran dengan urutan
 * apa adanya dari backend (`cover_url` selalu pertama, lalu `gallery[]`).
 * Rasio tampilan 4:5 sama dengan presentasi produk di web.
 * Foto bisa dibuka full-screen (zoom/pan) memakai ImageViewer existing.
 */
export function MediaGallery({ items = [], title, testID }) {
  const media = useMemo(
    () =>
      (items || [])
        .filter((item) => item?.url)
        .map((item) => ({ ...item, url: resolveMediaUrl(item.url) })),
    [items]
  );
  const [activeIndex, setActive] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(-1);

  // Index diturunkan (bukan disimpan ulang lewat effect) supaya aman ketika
  // daftar media berubah.
  const active = activeIndex < media.length ? activeIndex : 0;
  const current = media[active] || media[0] || null;
  const photos = media.filter((item) => item.file_type !== 'VIDEO');

  if (!current) {
    return (
      <View style={[styles.media, styles.empty]} testID={testID}>
        <Ionicons name="bag-outline" size={34} color={colors.textDim} />
        <Txt variant="small" tone="dim">
          Belum ada foto produk
        </Txt>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <View style={styles.mediaWrap}>
        {current.file_type === 'VIDEO' ? (
          <VideoPane key={current.url} url={current.url} />
        ) : (
          <Pressable
            onPress={() => setViewerIndex(Math.max(0, photos.findIndex((item) => item.url === current.url)))}
            testID="product-media-main"
          >
            <Image source={{ uri: current.url }} style={styles.media} contentFit="cover" transition={160} />
            <View style={styles.zoomHint}>
              <Ionicons name="expand-outline" size={13} color={colors.text} />
              <Txt variant="meta" tone="muted">
                Ketuk untuk zoom
              </Txt>
            </View>
          </Pressable>
        )}
      </View>

      {media.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbs}
          testID="product-media-thumbs"
        >
          {media.map((item, index) => (
            <Pressable
              key={item.id || item.url}
              onPress={() => setActive(index)}
              style={[styles.thumb, index === active ? styles.thumbActive : null]}
              testID={`product-media-thumb-${index}`}
            >
              <Image
                source={{ uri: item.thumbnail_url ? resolveMediaUrl(item.thumbnail_url) : item.url }}
                style={styles.thumbImage}
                contentFit="cover"
              />
              {item.file_type === 'VIDEO' ? (
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={12} color={colors.white} />
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <ImageViewer
        items={photos.map((item) => ({ ...item, caption: item.alt_text || title }))}
        index={viewerIndex}
        onClose={() => setViewerIndex(-1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mediaWrap: {
    width: '100%',
    borderRadius: radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  media: { width: '100%', aspectRatio: 4 / 5, backgroundColor: colors.black },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(4,9,26,0.72)',
  },
  thumbs: { gap: 8, paddingVertical: 10 },
  thumb: {
    width: 56,
    aspectRatio: 4 / 5,
    borderRadius: radii.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbActive: { borderColor: colors.accent, borderWidth: 2 },
  thumbImage: { width: '100%', height: '100%', backgroundColor: colors.surface },
  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -11,
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
});

export default MediaGallery;
