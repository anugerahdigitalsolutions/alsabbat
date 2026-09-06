/**
 * Foto pengajuan Pemain/Staf dari HP (kamera atau galeri).
 *
 * - Permission diminta lewat expo-image-picker (kamera & galeri).
 * - Foto di-resize (maks lebar 1080px) dan dikompres JPEG 0.75 sebelum upload
 *   agar ukuran wajar di jaringan seluler.
 * - Upload memakai infrastruktur media EXISTING lewat endpoint baru yang tipis
 *   `POST /api/baraya/uploads/photo` (Media Service + koleksi `media` yang sama
 *   dipakai Admin Panel). Tidak ada storage baru.
 */
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import api from '../api/client';

export const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const TARGET_WIDTH = 1080;

const PICKER_OPTIONS = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [3, 4],
  quality: 1,
  exif: false,
};

/** Kompres & resize sebelum upload (mengembalikan uri lokal baru). */
async function optimize(asset) {
  const width = asset?.width || 0;
  const actions = width > TARGET_WIDTH ? [{ resize: { width: TARGET_WIDTH } }] : [];
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    actions.forEach((action) => {
      if (action.resize) context.resize(action.resize);
    });
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: result.uri, width: result.width, height: result.height };
  } catch (e) {
    // Fallback: pakai foto asli bila modul manipulasi tidak tersedia.
    return { uri: asset.uri, width: asset.width, height: asset.height };
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

export async function pickFromGallery() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: 'Izin galeri belum diberikan. Aktifkan di pengaturan aplikasi.' };
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  if (result.canceled || !result.assets?.length) return { canceled: true };
  return { asset: await optimize(result.assets[0]) };
}

/** Kirim foto ke Media Service existing; mengembalikan URL tersimpan. */
export async function uploadPhoto(uri) {
  const form = new FormData();
  form.append('file', {
    uri,
    name: `member-photo-${Date.now()}.jpg`,
    type: 'image/jpeg',
  });
  const { data } = await api.post('/baraya/uploads/photo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
  return data;
}

export default { pickFromCamera, pickFromGallery, uploadPhoto };
