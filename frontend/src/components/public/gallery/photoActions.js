import { toast } from 'sonner';
import { resolveMediaUrl } from './mediaUtils';

const slugify = (value) =>
  String(value || 'alsabbat')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'alsabbat';

const driveFileId = (url) => (String(url || '').match(/[?&]id=([^&]+)/) || [])[1] || null;

/** Nama file unduhan yang rapi, mis: alsabbat-vs-alsabbat-putih-foto-03.jpg */
export const photoFileName = (item, albumTitle, index = 0) => {
  const ext = (String(item?.file_name || '').match(/\.(jpe?g|png|webp|gif)$/i) || ['.jpg'])[0].toLowerCase();
  return `${slugify(albumTitle)}-foto-${String(index + 1).padStart(2, '0')}${ext}`;
};

/** Unduh foto yang sedang dilihat memakai sumber file existing (tanpa menyalin file di server). */
export const downloadPhoto = async (item, { albumTitle, index = 0 } = {}) => {
  const src = resolveMediaUrl(item?.url || item?.thumbnail_url);
  if (!src) return;

  const fileId = driveFileId(src);
  if (fileId) {
    // Link unduhan resmi Google Drive (tanpa scraping, tanpa salinan baru)
    window.open(`https://drive.google.com/uc?export=download&id=${fileId}`, '_blank', 'noopener');
    toast.success('Unduhan foto dimulai.');
    return;
  }

  try {
    const res = await fetch(src, { mode: 'cors' });
    if (!res.ok) throw new Error('fetch failed');
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = photoFileName(item, albumTitle, index);
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(href), 4000);
    toast.success('Foto diunduh.');
  } catch (e) {
    window.open(src, '_blank', 'noopener');
    toast.info('Foto dibuka di tab baru — simpan dari sana bila unduhan langsung diblokir.');
  }
};

/** Share via Web Share API; fallback salin link + feedback singkat. */
export const sharePhoto = async (item, { albumTitle, url } = {}) => {
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const title = albumTitle ? `${albumTitle} — Galeri AL SABBAT` : 'Galeri AL SABBAT';

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, text: title, url: shareUrl });
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link galeri disalin.');
  } catch (e) {
    toast.error('Tidak dapat menyalin link. Salin manual dari address bar.');
  }
};
