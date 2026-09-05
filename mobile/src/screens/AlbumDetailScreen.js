import React, { useCallback, useMemo, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge } from '../components/Card';
import { ImageViewer } from '../components/ImageViewer';
import { EmptyState, ErrorState, Loading, RestrictedNotice } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';
import { formatDateMedium } from '../lib/format';
import { useAuth } from '../context/AuthContext';

/** Album detail + native image viewer — `/api/gallery/public/albums/{id}`. */
export default function AlbumDetailScreen({ navigation, route }) {
  const { albumId, title } = route?.params || {};
  const { canViewGallery, isAuthenticated } = useAuth();
  const [viewerIndex, setViewerIndex] = useState(-1);

  const album = useResource(() => endpoints.getAlbum(albumId), [albumId], {
    enabled: canViewGallery,
    fallbackMessage: 'Album tidak ditemukan.',
  });
  const drive = useResource(() => endpoints.getAlbumDrivePhotos(albumId), [albumId], {
    enabled: canViewGallery && Boolean(album.data?.drive_folder_id),
  });

  const media = useMemo(() => {
    const own = (album.data?.media || []).map((item) => ({
      id: item.id,
      caption: item.caption,
      file_name: item.file_name,
      url: resolveMediaUrl(item.url),
      thumbnail_url: resolveMediaUrl(item.thumbnail_url || item.url),
    }));
    const fromDrive = (drive.data?.items || []).map((item) => ({
      id: item.id,
      file_name: item.name,
      url: item.url,
      thumbnail_url: item.thumbnail_url || item.url,
    }));
    return [...own, ...fromDrive];
  }, [album.data, drive.data]);

  const size = useMemo(() => {
    const width = Dimensions.get('window').width - gutter * 2;
    return Math.floor((width - 8) / 2);
  }, []);

  const refresh = useCallback(() => {
    album.refresh();
    drive.refresh();
  }, [album, drive]);

  return (
    <Screen
      testID="album-detail-screen"
      header={<TopBar title={album.data?.title || title || 'Album'} onBack={() => navigation.goBack()} />}
      onRefresh={canViewGallery ? refresh : undefined}
      refreshing={album.refreshing}
      bottomInset={40}
    >
      {!canViewGallery ? (
        <RestrictedNotice
          feature="Album galeri"
          onAction={isAuthenticated ? undefined : () => navigation.navigate('Login')}
          actionLabel="Masuk"
        />
      ) : album.loading ? (
        <Loading rows={2} height={170} />
      ) : album.error || !album.data ? (
        <ErrorState message={album.error || 'Album tidak ditemukan.'} onRetry={album.reload} />
      ) : (
        <>
          <View style={styles.metaRow}>
            <Badge label={`${media.length} media`} tone="accent" />
            {formatDateMedium(album.data.date || album.data.published_at) ? (
              <Badge label={formatDateMedium(album.data.date || album.data.published_at)} />
            ) : null}
          </View>
          {album.data.description ? (
            <Txt variant="small" tone="muted" style={styles.description}>
              {album.data.description}
            </Txt>
          ) : null}

          {media.length ? (
            <View style={styles.grid}>
              {media.map((item, index) => (
                <Pressable
                  key={item.id || index}
                  onPress={() => setViewerIndex(index)}
                  style={({ pressed }) => [
                    styles.cell,
                    { width: size, height: size },
                    pressed ? styles.pressed : null,
                  ]}
                  testID={`album-media-${index}`}
                >
                  {item.thumbnail_url ? (
                    <Image
                      source={{ uri: item.thumbnail_url }}
                      style={StyleSheet.absoluteFill}
                      contentFit="cover"
                      transition={180}
                    />
                  ) : (
                    <View style={styles.cellFallback}>
                      <Ionicons name="image-outline" size={22} color={colors.textDim} />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="images-outline"
              title="Album masih kosong"
              description="Belum ada foto pada album ini."
            />
          )}
        </>
      )}

      <ImageViewer items={media} index={viewerIndex} onClose={() => setViewerIndex(-1)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  description: { marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cellFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.85 },
});
