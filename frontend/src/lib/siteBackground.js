import { useEffect, useState } from 'react';
import api from './api';
import { resolveMediaUrl } from '../components/public/gallery/mediaUtils';

export const SITE_BACKGROUND_KEY = 'site.background';

export const BACKGROUND_DEFAULT = {
  enabled: false,
  type: 'solid',
  color: '#FEFEFE',
  gradient: { color1: '#FEFEFE', color2: '#E8EDF5', direction: 'to-right' },
  image_url: '',
  image_size: 'cover',
  image_position: 'center',
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

/** Builds inline styles for the ambient layers rendered OUTSIDE the website frame. */
export const backgroundLayerStyles = (config) => {
  const cfg = parseBackgroundConfig(config);
  if (!cfg.enabled) return [];
  const layers = [];
  const opacity = Math.min(1, Math.max(0, Number(cfg.opacity ?? 0.1)));

  if (cfg.type === 'solid') {
    layers.push({ backgroundColor: cfg.color, opacity });
  } else if (cfg.type === 'gradient') {
    const dir = GRADIENT_DIRECTIONS.find((d) => d.value === cfg.gradient.direction)?.css || 'to right';
    layers.push({
      backgroundImage: `linear-gradient(${dir}, ${cfg.gradient.color1}, ${cfg.gradient.color2})`,
      opacity,
    });
  } else if (cfg.type === 'image' && cfg.image_url) {
    layers.push({
      backgroundImage: `url("${resolveMediaUrl(cfg.image_url)}")`,
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
  }
  return layers;
};

/** Reads the published background config from site content (public, read-only). */
export function useSiteBackground() {
  const [config, setConfig] = useState(BACKGROUND_DEFAULT);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/site-content/public')
      .then(({ data }) => {
        if (!cancelled) setConfig(parseBackgroundConfig(data?.items?.[SITE_BACKGROUND_KEY]));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return config;
}
