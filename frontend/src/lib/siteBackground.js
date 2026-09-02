import { useEffect, useState } from 'react';
import api from './api';
import { resolveMediaUrl } from '../components/public/gallery/mediaUtils';

export const SITE_BACKGROUND_KEY = 'site.background';

/** Warna dasar shell website (sama dengan default `.als-shell-bg`).
 *  Dipakai sebagai lapisan dasar agar nilai Transparansi tetap bermakna
 *  setelah paint default shell dimatikan (mencegah background tertimpa). */
export const SHELL_BASE_COLOR = '#f1f3f7';

/** Cache lokal + event supaya background tetap tampil setelah refresh dan
 *  langsung terpakai begitu Admin menyimpan (tanpa kembali ke default). */
export const BACKGROUND_CACHE_KEY = 'alsabbat.site.background';
export const BACKGROUND_UPDATED_EVENT = 'als:site-background-updated';

export const BACKGROUND_DEFAULT = {
  enabled: false,
  type: 'solid',
  color: '#FEFEFE',
  gradient: { color1: '#FEFEFE', color2: '#E8EDF5', direction: 'to-right' },
  image_url: '',
  image_size: 'cover',
  image_position: 'center top',
  opacity: 0.1,
  overlay_enabled: false,
  overlay_color: '#012891',
  overlay_opacity: 0.05,
};

export const GRADIENT_DIRECTIONS = [
  { value: 'to-right', label: 'Kiri → Kanan', css: 'to right' },
  { value: 'to-left', label: 'Kanan → Kiri', css: 'to left' },
  { value: 'to-bottom', label: 'Atas → Bawah', css: 'to bottom' },
  { value: 'to-top', label: 'Bawah → Atas', css: 'to top' },
  { value: 'diagonal', label: 'Diagonal', css: '135deg' },
];

export const IMAGE_SIZES = [
  { value: 'cover', label: 'Cover (mengisi penuh, boleh terpotong)' },
  { value: 'contain', label: 'Contain (utuh, ada ruang kosong)' },
  { value: 'auto', label: 'Auto (ukuran asli)' },
];

export const IMAGE_POSITIONS = [
  { value: 'center top', label: 'Tengah Atas (disarankan untuk 9:16)' },
  { value: 'center', label: 'Tengah' },
  { value: 'top', label: 'Atas' },
  { value: 'bottom', label: 'Bawah' },
  { value: 'left', label: 'Kiri' },
  { value: 'right', label: 'Kanan' },
];

export const parseBackgroundConfig = (raw) => {
  if (!raw) return BACKGROUND_DEFAULT;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      ...BACKGROUND_DEFAULT,
      ...parsed,
      gradient: { ...BACKGROUND_DEFAULT.gradient, ...(parsed.gradient || {}) },
    };
  } catch {
    return BACKGROUND_DEFAULT;
  }
};

/** Normalisasi URL gambar background: menerima URL absolut, protocol-relative,
 *  data URI, maupun path media relatif (`/api/media/...`). Mengembalikan string
 *  kosong bila tidak dapat dipakai supaya fallback bisa berjalan. */
export const resolveBackgroundImageUrl = (raw) => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value;
  return resolveMediaUrl(value.startsWith('/') ? value : `/${value}`);
};

/** Builds inline styles for the ambient layers rendered OUTSIDE the website frame. */
export const backgroundLayerStyles = (config) => {
  const cfg = parseBackgroundConfig(config);
  if (!cfg.enabled) return [];
  const layers = [];
  const opacity = Math.min(1, Math.max(0, Number(cfg.opacity ?? 0.1)));

  // Lapisan dasar netral: pengganti paint default shell yang dimatikan saat
  // background kustom aktif, sehingga warna/gradasi/gambar tidak tertimpa
  // radial-gradient default dan nilai Transparansi tetap konsisten.
  layers.push({ backgroundColor: SHELL_BASE_COLOR, opacity: 1 });

  const imageUrl = cfg.type === 'image' ? resolveBackgroundImageUrl(cfg.image_url) : '';

  if (cfg.type === 'gradient') {
    const dir = GRADIENT_DIRECTIONS.find((d) => d.value === cfg.gradient.direction)?.css || 'to right';
    layers.push({
      backgroundImage: `linear-gradient(${dir}, ${cfg.gradient.color1}, ${cfg.gradient.color2})`,
      opacity,
    });
  } else if (cfg.type === 'image' && imageUrl) {
    layers.push({
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: cfg.image_size === 'auto' ? 'auto' : cfg.image_size,
      backgroundPosition: cfg.image_position,
      backgroundRepeat: cfg.image_size === 'auto' ? 'repeat' : 'no-repeat',
      opacity,
    });
    if (cfg.overlay_enabled) {
      layers.push({
        backgroundColor: cfg.overlay_color,
        opacity: Math.min(1, Math.max(0, Number(cfg.overlay_opacity ?? 0.05))),
      });
    }
  } else {
    // 'solid' — juga menjadi fallback bila jenis 'image' dipilih tetapi URL
    // gambarnya kosong/tidak valid (tidak dibiarkan tanpa background).
    layers.push({ backgroundColor: cfg.color || BACKGROUND_DEFAULT.color, opacity });
  }
  return layers;
};

const readBackgroundCache = () => {
  try {
    const raw = window.localStorage.getItem(BACKGROUND_CACHE_KEY);
    return raw ? parseBackgroundConfig(raw) : null;
  } catch {
    return null;
  }
};

/** Dipakai Admin setelah menyimpan: menyegarkan cache + memberi tahu tab lain. */
export const publishBackgroundConfig = (config) => {
  const raw = typeof config === 'string' ? config : JSON.stringify(config);
  try {
    window.localStorage.setItem(BACKGROUND_CACHE_KEY, raw);
  } catch {
    /* storage penuh / diblokir — API tetap menjadi sumber utama */
  }
  try {
    window.dispatchEvent(new CustomEvent(BACKGROUND_UPDATED_EVENT, { detail: raw }));
  } catch {
    /* browser lama tanpa CustomEvent constructor */
  }
};

/** Reads the published background config from site content (public, read-only). */
export function useSiteBackground() {
  // Hidrasi dari cache lebih dulu supaya background tidak "berkedip" ke default
  // saat refresh / website dibuka kembali.
  const [config, setConfig] = useState(() => readBackgroundCache() || BACKGROUND_DEFAULT);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      api
        // `t` mencegah respons lama (cache browser/proxy) dipakai setelah Admin menyimpan.
        .get('/site-content/public', { params: { t: Date.now() } })
        .then(({ data }) => {
          if (cancelled) return;
          const raw = data?.items?.[SITE_BACKGROUND_KEY];
          setConfig(parseBackgroundConfig(raw));
          try {
            if (raw) window.localStorage.setItem(BACKGROUND_CACHE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
            else window.localStorage.removeItem(BACKGROUND_CACHE_KEY);
          } catch {
            /* diabaikan: cache hanya optimasi tampilan */
          }
        })
        .catch(() => {});

    load();

    const onUpdated = (event) => {
      if (event?.detail) setConfig(parseBackgroundConfig(event.detail));
      else load();
    };
    // Admin menyimpan di tab lain pada browser yang sama.
    const onStorage = (event) => {
      if (event.key === BACKGROUND_CACHE_KEY) setConfig(parseBackgroundConfig(event.newValue));
    };

    window.addEventListener(BACKGROUND_UPDATED_EVENT, onUpdated);
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener(BACKGROUND_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return config;
}
