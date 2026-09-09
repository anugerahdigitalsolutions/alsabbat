/**
 * Penelusuran folder Google Drive album di mobile: folder → subfolder → foto.
 * Memakai endpoint existing `/gallery/public/albums/{id}/drive-browse` (sama
 * dengan website) — satu request = satu batch (pageToken resmi Drive), jadi
 * tree Drive tidak pernah dimuat sekaligus.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Txt from './Txt';
import { RemoteImage } from './RemoteImage';
import { ImageViewer } from './ImageViewer';
import { EmptyState, ErrorState, Loading, Spinner } from './States';
import { PrimaryButton } from './Buttons';
import * as endpoints from '../api/endpoints';
import { apiErrorMessage } from '../api/client';

const PAGE_SIZE = 30; // 2 kolom × 15 baris thumbnail per batch

const EMPTY = {
  status: null,
  message: null,
  folder: null,
  path: [],
  folders: [],
  files: [],
  nextPageToken: null,
};

export function DriveFolderBrowser({ albumId, albumTitle, testID = 'drive-browser' }) {
  const [folderId, setFolderId] = useState(null);
  const folderKey = folderId || 'root';
  const [state, setState] = useState({ ...EMPTY, key: null });
  const [loadingMore, setLoadingMore] = useState(false);
  const [viewer, setViewer] = useState({ key: folderKey, index: -1 });

  // Loading & index viewer diturunkan dari state (bukan setState di dalam effect).
  const loading = state.key !== folderKey;
  const viewerIndex = viewer.key === folderKey ? viewer.index : -1;

  const fetchPage = useCallback(
    (id, token) =>
      endpoints.getAlbumDriveBrowse(albumId, { folderId: id, pageToken: token, pageSize: PAGE_SIZE }),
    [albumId]
  );

  useEffect(() => {
    let alive = true;
    fetchPage(folderId, null)
      .then((data) => {
        if (!alive) return;
        setState({
          key: folderKey,
          status: data?.status || 'ERROR',
          message: data?.message || null,
          folder: data?.folder || null,
          path: data?.path || [],
          folders: data?.folders || [],
          files: data?.files || [],
          nextPageToken: data?.next_page_token || null,
        });
      })
      .catch((e) => {
        if (!alive) return;
        setState({
          ...EMPTY,
          key: folderKey,
          status: 'ERROR',
          message: apiErrorMessage(e, 'Folder Google Drive gagal dimuat.'),
        });
      });
    return () => {
      alive = false;
    };
  }, [fetchPage, folderId, folderKey]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !state.nextPageToken) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(folderId, state.nextPageToken);
      setState((prev) => ({
        ...prev,
        folders: [...prev.folders, ...(data?.folders || [])],
        files: [...prev.files, ...(data?.files || [])],
        nextPageToken: data?.next_page_token || null,
      }));
    } catch {
      setState((prev) => ({ ...prev, message: 'Batch foto berikutnya gagal dimuat. Coba lagi.' }));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, folderId, loading, loadingMore, state.nextPageToken]);

  const size = useMemo(() => {
    const width = Dimensions.get('window').width - gutter * 2;
    return Math.floor((width - 8) / 2);
  }, []);

  const crumbs = state.path || [];
  const parentId = crumbs.length >= 2 ? crumbs[crumbs.length - 2].id : null;
  const photos = state.files || [];
  const notice = state.status && !['OK', 'EMPTY'].includes(state.status) ? state.message : null;
  const reload = () => setState((prev) => ({ ...prev, key: null }));

  if (loading) return <Loading rows={2} height={150} testID={`${testID}-loading`} />;

  if (notice && !photos.length && !state.folders.length) {
    return <ErrorState message={notice} onRetry={folderId ? () => setFolderId(null) : reload} testID={`${testID}-error`} />;
  }

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.crumbs}
        testID={`${testID}-breadcrumb`}
      >
        <Pressable onPress={() => setFolderId(null)} testID={`${testID}-crumb-root`}>
          <Txt variant="smallStrong" tone={folderId ? 'accent' : 'muted'} numberOfLines={1}>
            {albumTitle || 'Album'}
          </Txt>
        </Pressable>
        {crumbs.map((crumb, index) => (
          <View key={crumb.id} style={styles.crumb}>
            <Ionicons name="chevron-forward" size={12} color={colors.textDim} />
            <Pressable
              onPress={() => (index === crumbs.length - 1 ? null : setFolderId(crumb.id))}
              testID={`${testID}-crumb-${index}`}
            >
              <Txt
                variant="smallStrong"
                tone={index === crumbs.length - 1 ? 'default' : 'accent'}
                numberOfLines={1}
              >
                {crumb.name}
              </Txt>
            </Pressable>
          </View>
        ))}
      </ScrollView>

      {folderId ? (
        <Pressable onPress={() => setFolderId(parentId)} style={styles.back} testID={`${testID}-back`}>
          <Ionicons name="arrow-back" size={15} color={colors.accent} />
          <Txt variant="smallStrong" tone="accent">
            {parentId ? 'Folder sebelumnya' : `Kembali ke ${albumTitle || 'album'}`}
          </Txt>
        </Pressable>
      ) : null}

      {notice ? (
        <Txt variant="small" tone="muted" style={styles.notice} testID={`${testID}-notice`}>
          {notice}
        </Txt>
      ) : null}

      {state.folders.length ? (
        <View style={styles.folders} testID={`${testID}-folders`}>
          {state.folders.map((folder) => (
            <Pressable
              key={folder.id}
              onPress={() => setFolderId(folder.id)}
              style={({ pressed }) => [styles.folderRow, pressed ? styles.pressed : null]}
              testID={`${testID}-folder-${folder.id}`}
            >
              <View style={styles.folderIcon}>
                <Ionicons name="folder" size={17} color={colors.accent} />
              </View>
              <View style={styles.folderBody}>
                <Txt variant="smallStrong" numberOfLines={2}>
                  {folder.name}
                </Txt>
                <Txt variant="meta" tone="dim">
                  {folder.item_count ? `${folder.item_count} item` : 'Buka folder'}
                </Txt>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textDim} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {photos.length ? (
        <View style={styles.grid} testID={`${testID}-grid`}>
          {photos.map((item, index) => (
            <Pressable
              key={item.id || index}
              onPress={() => setViewer({ key: folderKey, index })}
              style={({ pressed }) => [
                styles.cell,
                { width: size, height: size },
                pressed ? styles.pressed : null,
              ]}
              testID={`${testID}-photo-${index}`}
            >
              <RemoteImage
                uri={item.thumbnail_url || item.url}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={180}
              />
            </Pressable>
          ))}
        </View>
      ) : null}

      {!state.folders.length && !photos.length ? (
        <EmptyState
          icon="images-outline"
          title="Folder ini kosong"
          description={state.message || 'Belum ada foto atau subfolder di folder ini.'}
          testID={`${testID}-empty`}
        />
      ) : null}

      {state.nextPageToken ? (
        loadingMore ? (
          <Spinner style={styles.more} />
        ) : (
          <PrimaryButton
            label="Muat foto berikutnya"
            onPress={loadMore}
            style={styles.more}
            testID={`${testID}-load-more`}
          />
        )
      ) : null}

      <ImageViewer
        items={photos}
        index={viewerIndex}
        onClose={() => setViewer({ key: folderKey, index: -1 })}
        albumTitle={state.folder?.name || albumTitle}
        actions
      />
    </View>
  );
}

const styles = StyleSheet.create({
  crumbs: { alignItems: 'center', gap: 6, paddingVertical: 2, paddingRight: 12 },
  crumb: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  notice: { marginTop: 10 },
  folders: { marginTop: 14, gap: 8 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  folderIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  folderBody: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  cell: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  more: { marginTop: 14 },
  pressed: { opacity: 0.85 },
});

export default DriveFolderBrowser;
