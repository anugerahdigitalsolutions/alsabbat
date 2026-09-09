/**
 * Simpan & bagikan foto galeri di perangkat (iOS + Android).
 *
 * Sumber URL memakai rantai kandidat dari `driveImage.js` (fix Gallery
 * sebelumnya) sehingga tidak ada URL Google Drive yang di-hardcode. File
 * diunduh dulu ke cache app supaya yang disimpan/dibagikan adalah gambar
 * asli — bukan halaman HTML atau screenshot UI.
 */
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { imageSourceCandidates } from './driveImage';

const CACHE_FOLDER = 'alsabbat-gallery';
const MIN_IMAGE_BYTES = 1024; // di bawah ini hampir pasti bukan gambar valid

const slugify = (value) =>
  String(value || 'alsabbat')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'alsabbat';

/** Nama file rapi, mengikuti konvensi web: `<album>-foto-03.jpg`. */
export const photoFileName = (item, albumTitle, index = 0) => {
  const ext = (String(item?.file_name || '').match(/\.(jpe?g|png|webp|gif)$/i) || ['.jpg'])[0].toLowerCase();
  return `${slugify(albumTitle)}-foto-${String(index + 1).padStart(2, '0')}${ext}`;
};

const cacheDirectory = () => {
  const dir = new Directory(Paths.cache, CACHE_FOLDER);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

/** Unduh foto ke cache app, mencoba tiap kandidat URL sampai ada yang valid. */
export async function downloadPhotoToCache(item, { albumTitle, index = 0 } = {}) {
  const candidates = imageSourceCandidates(item?.url || item?.thumbnail_url);
  if (!candidates.length) throw new Error('URL foto tidak tersedia.');

  const name = photoFileName(item, albumTitle, index);
  let lastError = null;

  for (const url of candidates) {
    try {
      const target = new File(cacheDirectory(), name);
      if (target.exists) target.delete();
      const file = await File.downloadFileAsync(url, target, { idempotent: true });
      const size = file?.size ?? 0;
      if (size < MIN_IMAGE_BYTES) {
        if (file?.exists) file.delete();
        throw new Error('Berkas hasil unduhan tidak valid.');
      }
      return file.uri;
    } catch (e) {
      lastError = e;
    }
  }

  throw lastError || new Error('Foto gagal diunduh.');
}

/** Simpan foto ke galeri/Foto perangkat. Tidak pernah throw ke pemanggil. */
export async function savePhotoToDevice(item, meta = {}) {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission?.granted) {
      return {
        ok: false,
        reason: 'PERMISSION_DENIED',
        message: 'Izin akses galeri belum diberikan. Aktifkan di Pengaturan lalu coba lagi.',
      };
    }
    const uri = await downloadPhotoToCache(item, meta);
    await MediaLibrary.Asset.create(uri);
    return { ok: true, message: 'Foto tersimpan di galeri perangkat.' };
  } catch (e) {
    return { ok: false, reason: 'FAILED', message: e?.message || 'Foto gagal disimpan. Coba lagi.' };
  }
}

/** Bagikan file foto lewat share sheet native (WhatsApp dll muncul otomatis). */
export async function sharePhotoFile(item, meta = {}) {
  try {
    if (!(await Sharing.isAvailableAsync())) {
      return { ok: false, reason: 'UNAVAILABLE', message: 'Berbagi tidak tersedia di perangkat ini.' };
    }
    const uri = await downloadPhotoToCache(item, meta);
    const isPng = /\.png$/i.test(uri);
    await Sharing.shareAsync(uri, {
      mimeType: isPng ? 'image/png' : 'image/jpeg',
      UTI: isPng ? 'public.png' : 'public.jpeg',
      dialogTitle: meta?.albumTitle ? `Bagikan foto — ${meta.albumTitle}` : 'Bagikan foto AL SABBAT',
    });
    return { ok: true, message: 'Foto siap dibagikan.' };
  } catch (e) {
    return { ok: false, reason: 'FAILED', message: e?.message || 'Foto gagal dibagikan. Coba lagi.' };
  }
}
