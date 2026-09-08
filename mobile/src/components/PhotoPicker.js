import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii } from '../theme';
import Txt from './Txt';
import { pickFromCamera, pickFromGallery, uploadPhoto } from '../lib/photoUpload';
import { apiErrorMessage, resolveMediaUrl } from '../api/client';

/**
 * Ambil/pilih foto → preview → upload ke media infrastructure existing.
 * `onChange(url)` dipanggil dengan URL foto tersimpan (atau null bila dihapus).
 */
export function PhotoPicker({ label = 'FOTO', value, onChange, hint, testID, uploader }) {
  const [localUri, setLocalUri] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handle = useCallback(
    async (source) => {
      setError(null);
      const result = source === 'camera' ? await pickFromCamera() : await pickFromGallery();
      if (result.canceled) return;
      if (result.error) {
        setError(result.error);
        return;
      }
      setLocalUri(result.asset.uri);
      setBusy(true);
      try {
        // Asset lengkap dikirim (uri + mime + nama) agar multipart valid.
        const stored = uploader ? await uploader(result.asset) : await uploadPhoto(result.asset);
        const url = stored?.url || stored?.photo_url || null;
        if (!url) throw new Error('Server tidak mengembalikan URL foto.');
        onChange(url);
      } catch (e) {
        setLocalUri(null);
        onChange(null);
        setError(apiErrorMessage(e, e?.message || 'Foto gagal diunggah. Coba lagi.'));
      } finally {
        setBusy(false);
      }
    },
    [onChange, uploader]
  );

  const remove = useCallback(() => {
    setLocalUri(null);
    setError(null);
    onChange(null);
  }, [onChange]);

  const preview = localUri || resolveMediaUrl(value);
  const uploaded = Boolean(value) && !busy;

  return (
    <View style={styles.block} testID={testID}>
      <Txt variant="meta" tone="muted" style={styles.label}>
        {label}
      </Txt>

      <View style={styles.row}>
        <View style={styles.previewWrap}>
          {preview ? (
            <Image source={{ uri: preview }} style={styles.preview} contentFit="cover" transition={160} />
          ) : (
            <View style={[styles.preview, styles.previewEmpty]}>
              <Ionicons name="person-outline" size={26} color={colors.textDim} />
            </View>
          )}
          {busy ? (
            <View style={styles.overlay}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : null}
          {uploaded ? (
            <View style={styles.badge}>
              <Ionicons name="checkmark" size={12} color={colors.onAccent} />
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => handle('camera')}
            disabled={busy}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
            testID="photo-camera"
          >
            <Ionicons name="camera-outline" size={17} color={colors.accent} />
            <Txt variant="smallStrong">Ambil Foto</Txt>
          </Pressable>
          <Pressable
            onPress={() => handle('gallery')}
            disabled={busy}
            style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
            testID="photo-gallery"
          >
            <Ionicons name="images-outline" size={17} color={colors.accent} />
            <Txt variant="smallStrong">{preview ? 'Ganti dari Galeri' : 'Pilih dari Galeri'}</Txt>
          </Pressable>
          {preview ? (
            <Pressable
              onPress={remove}
              disabled={busy}
              style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}
              testID="photo-remove"
            >
              <Ionicons name="trash-outline" size={17} color={colors.lose} />
              <Txt variant="smallStrong" tone="lose">
                Hapus Foto
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <Txt variant="small" tone="lose" style={styles.hint}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" tone="dim" style={styles.hint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 16 },
  label: { marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  previewWrap: { position: 'relative' },
  preview: {
    width: 96,
    height: 128,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  previewEmpty: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,9,26,0.65)',
    borderRadius: radii.md,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flex: 1, gap: 8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 42,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8 },
  hint: { marginTop: 8, marginLeft: 4 },
});

export default PhotoPicker;
