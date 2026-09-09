/**
 * Normalisasi URL gambar Google Drive untuk loader gambar native (iOS/Android).
 *
 * Backend mengirim `https://drive.google.com/thumbnail?id=...&sz=w800` — aman di
 * browser (mengikuti redirect), tetapi loader native React Native/Expo sering
 * gagal pada URL tersebut (redirect + respons HTML). Bentuk direct-image
 * `https://lh3.googleusercontent.com/d/<id>=w<size>` mengembalikan biner gambar
 * langsung. ID selalu diambil dari URL yang dikirim API (tidak ada hardcode).
 */
const ID_PATTERNS = [
  /\/file\/d\/([A-Za-z0-9_-]{10,})/,
  /\/d\/([A-Za-z0-9_-]{10,})/,
  /[?&]id=([A-Za-z0-9_-]{10,})/,
];

const DRIVE_HOSTS = ['drive.google.com', 'drive.usercontent.google.com', 'lh3.googleusercontent.com'];

export const isDriveUrl = (url) => {
  const value = String(url || '');
  return DRIVE_HOSTS.some((host) => value.includes(host));
};

export const driveFileId = (url) => {
  const value = String(url || '');
  if (!isDriveUrl(value)) return null;
  for (const pattern of ID_PATTERNS) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/** Lebar dari parameter `sz=w800` / `=w800` bila ada, default 1200. */
export const driveWidth = (url, fallback = 1200) => {
  const value = String(url || '');
  const match = value.match(/[?&]sz=w(\d{2,5})/) || value.match(/=w(\d{2,5})/);
  const width = match ? parseInt(match[1], 10) : NaN;
  return Number.isFinite(width) && width > 0 ? width : fallback;
};

/** URL Drive yang bisa dirender langsung oleh expo-image (iOS + Android). */
export const driveDirectUrl = (url) => {
  const id = driveFileId(url);
  if (!id) return url || null;
  return `https://lh3.googleusercontent.com/d/${id}=w${driveWidth(url)}`;
};

/**
 * Rantai kandidat URL: direct-image dulu, lalu endpoint Drive lain sebagai
 * cadangan bila Google menolak salah satu bentuk.
 */
export const imageSourceCandidates = (url) => {
  if (!url) return [];
  const id = driveFileId(url);
  if (!id) return [String(url)];
  const width = driveWidth(url);
  const candidates = [
    `https://lh3.googleusercontent.com/d/${id}=w${width}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`,
    `https://drive.usercontent.google.com/download?id=${id}&export=view`,
  ];
  return candidates.filter((item, index) => candidates.indexOf(item) === index);
};
