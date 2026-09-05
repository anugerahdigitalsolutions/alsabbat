import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import Screen from '../components/Screen';
import Txt from '../components/Txt';
import { AlbumCard } from '../components/PlayerCard';
import { EmptyState, ErrorState, Loading, RestrictedNotice } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';

/**
 * Media / gallery — `/api/gallery/public/albums`.
 * Access is limited to Pemain & Staf (enforced by the backend with 403); the
 * screen shows a proper restricted state instead of inventing content.
 */
export default function MediaScreen({ navigation }) {
  const { canViewGallery, isAuthenticated, loading: authLoading } = useAuth();
  const albums = useResourceList(() => endpoints.getAlbums({ limit: 40 }), [canViewGallery], {
    enabled: canViewGallery,
  });

  const open = useCallback(
    (album) => navigation.navigate('AlbumDetail', { albumId: album.id, title: album.title }),
    [navigation]
  );

  return (
    <Screen
      onRefresh={canViewGallery ? albums.refresh : undefined}
      refreshing={albums.refreshing}
      testID="media-screen"
    >
      <View style={styles.header}>
        <Txt variant="display">Media</Txt>
        <Txt variant="small" tone="muted">
          Galeri foto resmi AL SABBAT Football Club.
        </Txt>
      </View>

      {authLoading ? (
        <Loading rows={2} height={150} />
      ) : !canViewGallery ? (
        <RestrictedNotice
          feature="Galeri AL SABBAT"
          onAction={isAuthenticated ? undefined : () => navigation.navigate('Login')}
          actionLabel="Masuk"
          testID="media-restricted"
        />
      ) : albums.loading ? (
        <Loading rows={3} height={150} testID="media-loading" />
      ) : albums.error ? (
        <ErrorState message={albums.error} onRetry={albums.reload} testID="media-error" />
      ) : albums.items.length ? (
        <View style={styles.stack}>
          {albums.items.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              onPress={() => open(album)}
              testID={`album-${album.id}`}
            />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="images-outline"
          title="Belum ada album"
          description="Album galeri akan tampil di sini setelah dipublikasikan oleh klub."
          testID="media-empty"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16, gap: 2 },
  stack: { gap: 12 },
});
