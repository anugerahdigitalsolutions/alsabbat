/**
 * Direct (signed) upload browser -> Cloudinary.
 *
 * Alasan: fungsi serverless Vercel punya batas ukuran body request, jadi berkas
 * TIDAK dikirim melalui backend. Alur: backend memberi tanda tangan -> browser
 * mengunggah langsung ke Cloudinary -> hasilnya (public_id + secure_url) dikirim
 * ke backend untuk disimpan di MongoDB.
 *
 * Bila backend menjawab bahwa provider media bukan Cloudinary (mis. LOCAL saat
 * pengembangan), pemanggil cukup fallback ke upload multipart lama.
 */

export class DirectUploadUnavailable extends Error {}

/** Cache kapabilitas per sesi browser supaya tidak mencoba tanda tangan berulang
 *  ketika provider media memang bukan Cloudinary (mis. LOCAL saat pengembangan). */
const UNAVAILABLE_KEY = 'als.direct_upload_unavailable';
let unavailableCache = false;

const isUnavailable = () => {
  if (unavailableCache) return true;
  try {
    return window.sessionStorage.getItem(UNAVAILABLE_KEY) === '1';
  } catch (e) {
    return false;
  }
};

const markUnavailable = () => {
  unavailableCache = true;
  try {
    window.sessionStorage.setItem(UNAVAILABLE_KEY, '1');
  } catch (e) {
    /* sessionStorage tidak tersedia — cukup cache di memori */
  }
};

const xhrUpload = (url, form, onProgress) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          reject(new Error('Respons Cloudinary tidak dapat dibaca.'));
        }
      } else {
        reject(new Error(`Cloudinary menolak upload (HTTP ${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Koneksi ke Cloudinary gagal.'));
    xhr.send(form);
  });

/** Ambil tanda tangan; melempar DirectUploadUnavailable bila tidak didukung. */
export const requestUploadSignature = async ({ client, signPath, file }) => {
  if (isUnavailable()) {
    throw new DirectUploadUnavailable('Direct upload tidak tersedia (dari cache sesi).');
  }
  try {
    const { data } = await client.post(signPath, {
      file_name: file.name || 'upload',
      mime_type: file.type || 'application/octet-stream',
    });
    if (!data || data.provider !== 'CLOUDINARY' || !data.signature) {
      markUnavailable();
      throw new DirectUploadUnavailable('Direct upload tidak tersedia.');
    }
    return data;
  } catch (error) {
    if (error instanceof DirectUploadUnavailable) throw error;
    // 4xx/5xx apa pun dianggap "tidak tersedia" agar pemanggil bisa fallback.
    markUnavailable();
    throw new DirectUploadUnavailable('Direct upload tidak tersedia.');
  }
};

/** Unggah berkas langsung ke Cloudinary memakai tanda tangan dari backend. */
export const uploadWithSignature = async ({ signature, file, onProgress }) => {
  if (signature.max_bytes && file.size > signature.max_bytes) {
    throw new Error(
      `Ukuran berkas melebihi batas ${Math.round(signature.max_bytes / (1024 * 1024))} MB.`
    );
  }
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', signature.api_key);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('public_id', signature.public_id);
  if (signature.upload_preset) form.append('upload_preset', signature.upload_preset);
  const result = await xhrUpload(signature.upload_url, form, onProgress);
  return {
    public_id: result.public_id || signature.public_id,
    secure_url: result.secure_url || result.url,
    resource_type: result.resource_type || signature.resource_type,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
    storage_key: `${result.resource_type || signature.resource_type}:${
      result.public_id || signature.public_id
    }`,
  };
};

/**
 * Alur lengkap untuk Admin Panel: sign -> upload ke Cloudinary -> catat di MongoDB.
 * Melempar DirectUploadUnavailable bila provider bukan Cloudinary.
 */
export const directUploadMedia = async ({ client, file, onProgress }) => {
  const signature = await requestUploadSignature({
    client,
    signPath: '/media/direct-upload/sign',
    file,
  });
  const uploaded = await uploadWithSignature({ signature, file, onProgress });
  const { data } = await client.post('/media/direct-upload/complete', {
    file_name: file.name || 'upload',
    mime_type: file.type || null,
    public_id: uploaded.public_id,
    secure_url: uploaded.secure_url,
    resource_type: uploaded.resource_type,
    storage_key: uploaded.storage_key,
    bytes: uploaded.bytes,
    width: uploaded.width,
    height: uploaded.height,
    duration: uploaded.duration,
  });
  return data;
};
