import { BACKEND_URL } from '../../../lib/api';

/** Local storage URLs come back as `/api/media/files/...` — resolve to absolute. */
export const resolveMediaUrl = (url) => (url && url.startsWith('/') ? `${BACKEND_URL}${url}` : url);

export const formatAlbumDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};
