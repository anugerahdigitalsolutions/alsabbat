/**
 * Ambil / pilih foto dari HP lalu unggah ke infrastruktur MEDIA EXISTING.
 *
 * Alur: ImagePicker → optimize (resize/kompres) → FormData → endpoint upload
 * EXISTING → URL media tersimpan.
 *
 * Catatan penting (root cause bug upload sebelumnya):
 *  1. JANGAN pernah menetapkan header `Content-Type` untuk request FormData.
 *     Boundary multipart hanya bisa dibuat runtime; header manual
 *     (`multipart/form-data` tanpa boundary, atau `application/json`) membuat
 *     backend menolak berkas. Header dibersihkan di `api/client.js`.
 *  2. Endpoint upload dipilih dari daftar endpoint EXISTING dan otomatis
 *     jatuh ke alternatif bila server yang terpasang belum memiliki endpoint
 *     terbaru (404/405) — mis. server produksi yang belum di-deploy.
 *     Tidak ada endpoint baru dan tidak ada koleksi media baru.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import api, { isEndpointMissing } from '../api/client';

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const TARGET_WIDTH = 1080;

/**
 * Endpoint EXISTING untuk foto pengajuan Pemain/Staf, berurutan:
 *  - `/baraya/uploads/photo` → juga terdaftar di Media Library Admin Panel.
 *  - `/baraya/me/upload`     → endpoint lama (tersedia di semua versi backend),
 *                              menyimpan lewat Media Service yang sama.
 */
const APPLICATION_PHOTO_ENDPOINTS = ['/baraya/uploads/photo', '/baraya/me/upload'];

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [3, 4],
  quality: 1,
  exif: false,
};

const MIME_BY_EXTENSION = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
};

/** MIME yang diterima backend untuk foto (mengikuti validasi server). */
const ALLOWED_MIME = new Set(Object.values(MIME_BY_EXTENSION));

const extensionOf = (uri) => {
  const clean = String(uri || '').split('?')[0].split('#')[0];
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  return match ? match[1].toLowerCase() : '';
};

const extensionForMime = (mime) => {
  const entry = Object.entries(MIME_BY_EXTENSION).find(([, value]) => value === mime);
  return entry ? entry[0] : 'jpg';
};

/** MIME final: dari picker → dari ekstensi → JPEG (selalu tipe gambar valid). */
export function resolveMime(asset) {
  const fromAsset = String(asset?.mimeType || asset?.type || '').toLowerCase();
  if (ALLOWED_MIME.has(fromAsset)) return fromAsset;
  const fromExtension = MIME_BY_EXTENSION[extensionOf(asset?.uri)];
  if (fromExtension) return fromExtension;
  return 'image/jpeg';
}

/** Nama berkas yang selalu punya ekstensi sesuai MIME. */
export function resolveFileName(asset, mime, prefix = 'alsabbat-photo') {
  const raw = String(asset?.fileName || asset?.name || '').trim();
  const extension = extensionForMime(mime);
  if (raw && /\.[a-zA-Z0-9]+$/.test(raw)) return raw;
  return `${prefix}-${Date.now()}.${extension}`;
}

/**
 * FormData multipart untuk React Native.
 * URI Android (`file://`, `content://`) dan iOS (`file://`, `ph://` setelah
 * dimanipulasi) ditangani langsung oleh runtime RN.
 */
export function buildPhotoForm(asset, { fieldName = 'file', prefix } = {}) {
  const mime = resolveMime(asset);
  const form = new FormData();
  form.append(fieldName, {
    uri: String(asset?.uri || ''),
    name: resolveFileName(asset, mime, prefix),
    type: mime,
  });
  return form;
}

/** Kompres & resize sebelum upload (mengembalikan asset lokal baru). */
async function optimize(asset) {
  const width = asset?.width || 0;
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    if (width > TARGET_WIDTH) context.resize({ width: TARGET_WIDTH });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
      mimeType: 'image/jpeg',
    };
  } catch (e) {
    // Fallback: pakai foto asli bila modul manipulasi tidak tersedia.
    return {
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      mimeType: resolveMime(asset),
      fileName: asset.fileName,
      fileSize: asset.fileSize,
    };
  }
}

export async function pickFromCamera() {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Izin kamera belum diberikan. Aktifkan di pengaturan aplikasi.' };
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets?.length) return { canceled: true };
  return { asset: await optimize(result.assets[0]) };
}

export async function pickFromGallery(options = {}) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Izin galeri belum diberikan. Aktifkan di pengaturan aplikasi.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync({ ...PICKER_OPTIONS, ...options });
  if (result.canceled || !result.assets?.length) return { canceled: true };
  return { asset: await optimize(result.assets[0]) };
}

/**
 * Unggah foto ke salah satu endpoint media EXISTING.
 * Menerima objek asset dari picker ATAU string uri (kompatibel ke belakang).
 * @returns {{ url: string, id: string|null }}
 */
export async function uploadPhoto(input, { endpoints = APPLICATION_PHOTO_ENDPOINTS, prefix } = {}) {
  const asset = typeof input === 'string' ? { uri: input } : input || {};
  if (!asset.uri) throw new Error('Foto belum dipilih.');
  if (asset.fileSize && asset.fileSize > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran foto maksimal 6 MB. Pilih foto lain.');
  }

  let lastError = null;
  for (const path of endpoints) {
    try {
      // FormData dibuat ulang tiap percobaan (body multipart tidak bisa dipakai dua kali).
      const { data } = await api.post(path, buildPhotoForm(asset, { prefix }), {
        timeout: 60000,
      });
      const url = data?.url || data?.photo_url;
      if (url) return { url, id: data?.id || null, raw: data };
      lastError = new Error('Server tidak mengembalikan URL foto.');
    } catch (e) {
      lastError = e;
      // Endpoint tidak ada di backend terpasang → coba endpoint existing lain.
      if (isEndpointMissing(e)) continue;
      throw e;
    }
  }
  throw lastError || new Error('Foto gagal diunggah.');
}

/** Foto profil akun sendiri — endpoint existing `POST /api/baraya/me/photo`. */
export async function uploadProfilePhoto(input) {
  const result = await uploadPhoto(input, {
    endpoints: ['/baraya/me/photo'],
    prefix: 'profil',
  });
  return result;
}

/** Bukti foto pesanan — endpoint existing (kepemilikan divalidasi server). */
export async function uploadOrderEvidencePhoto(orderId, input) {
  return uploadPhoto(input, {
    endpoints: [`/baraya/orders/${orderId}/evidence`],
    prefix: 'bukti',
  });
}

export default {
  pickFromCamera,
  pickFromGallery,
  uploadPhoto,
  uploadProfilePhoto,
  uploadOrderEvidencePhoto,
  buildPhotoForm,
};
