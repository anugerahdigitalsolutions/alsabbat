import { useCallback, useEffect, useState } from 'react';
import api from './api';

/** Sumber tunggal desain Kartu Pertandingan (site_content). */
export const MATCH_CARD_TRANSPARENCY_KEY = 'match.card.overlay_transparency';
export const MATCH_CARD_DEFAULT_TRANSPARENCY = 35;

/** Key tambahan — background per rasio, overlay, dan zoom logo. */
export const MATCH_CARD_KEYS = {
  feedBackground: 'match.card.feed_background_url',
  storyBackground: 'match.card.story_background_url',
  // Background global khusus Kartu Hasil (independen dari Kartu Pertandingan).
  resultFeedBackground: 'match.card.result_feed_background_url',
  resultStoryBackground: 'match.card.result_story_background_url',
  overlayEnabled: 'match.card.overlay_enabled',
  overlayColor: 'match.card.overlay_color',
  overlayOpacity: 'match.card.overlay_opacity',
  logoZoom: 'match.card.logo_zoom',
};

export const MATCH_CARD_DEFAULTS = {
  overlayEnabled: true,
  overlayColor: '#012891',
  overlayOpacity: 55,
  logoZoom: 100,
};

/** Batas zoom logo — dijaga agar logo selalu utuh di dalam containernya. */
export const LOGO_ZOOM_MIN = 60;
export const LOGO_ZOOM_MAX = 130;

export const clampTransparency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return MATCH_CARD_DEFAULT_TRANSPARENCY;
  return Math.min(100, Math.max(0, Math.round(num)));
};

export const clampPercent = (value, fallback, min = 0, max = 100) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
};

export const clampLogoZoom = (value) =>
  clampPercent(value, MATCH_CARD_DEFAULTS.logoZoom, LOGO_ZOOM_MIN, LOGO_ZOOM_MAX);

/** '#RRGGBB' + opacity(0..100) -> 'rgba(r,g,b,a)'. Fallback ke navy klub. */
export const hexToRgba = (hex, opacityPercent) => {
  const fallback = MATCH_CARD_DEFAULTS.overlayColor;
  const value = /^#([0-9a-f]{6})$/i.test(String(hex || '').trim()) ? String(hex).trim() : fallback;
  const r = parseInt(value.slice(1, 3), 16);
  const g = parseInt(value.slice(3, 5), 16);
  const b = parseInt(value.slice(5, 7), 16);
  const a = clampPercent(opacityPercent, MATCH_CARD_DEFAULTS.overlayOpacity) / 100;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
};

const asBool = (raw, fallback) => {
  if (raw === undefined || raw === null || raw === '') return fallback;
  return String(raw).trim().toLowerCase() === 'true';
};

const asText = (raw) => (raw === undefined || raw === null ? '' : String(raw).trim());

export const useMatchCardDesign = () => {
  const [transparency, setTransparency] = useState(MATCH_CARD_DEFAULT_TRANSPARENCY);
  const [feedBackground, setFeedBackground] = useState('');
  const [storyBackground, setStoryBackground] = useState('');
  const [resultFeedBackground, setResultFeedBackground] = useState('');
  const [resultStoryBackground, setResultStoryBackground] = useState('');
  const [overlayEnabled, setOverlayEnabled] = useState(MATCH_CARD_DEFAULTS.overlayEnabled);
  const [overlayColor, setOverlayColor] = useState(MATCH_CARD_DEFAULTS.overlayColor);
  const [overlayOpacity, setOverlayOpacity] = useState(MATCH_CARD_DEFAULTS.overlayOpacity);
  const [logoZoom, setLogoZoom] = useState(MATCH_CARD_DEFAULTS.logoZoom);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get('/site-content/public');
      const items = data?.items || {};
      const raw = items[MATCH_CARD_TRANSPARENCY_KEY];
      setTransparency(raw === undefined || raw === null || raw === '' ? MATCH_CARD_DEFAULT_TRANSPARENCY : clampTransparency(raw));
      setFeedBackground(asText(items[MATCH_CARD_KEYS.feedBackground]));
      setStoryBackground(asText(items[MATCH_CARD_KEYS.storyBackground]));
      setResultFeedBackground(asText(items[MATCH_CARD_KEYS.resultFeedBackground]));
      setResultStoryBackground(asText(items[MATCH_CARD_KEYS.resultStoryBackground]));
      setOverlayEnabled(asBool(items[MATCH_CARD_KEYS.overlayEnabled], MATCH_CARD_DEFAULTS.overlayEnabled));
      setOverlayColor(asText(items[MATCH_CARD_KEYS.overlayColor]) || MATCH_CARD_DEFAULTS.overlayColor);
      setOverlayOpacity(clampPercent(items[MATCH_CARD_KEYS.overlayOpacity], MATCH_CARD_DEFAULTS.overlayOpacity));
      setLogoZoom(clampLogoZoom(items[MATCH_CARD_KEYS.logoZoom]));
    } catch (e) {
      setTransparency(MATCH_CARD_DEFAULT_TRANSPARENCY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    transparency,
    feedBackground,
    storyBackground,
    resultFeedBackground,
    resultStoryBackground,
    overlayEnabled,
    overlayColor,
    overlayOpacity,
    logoZoom,
    loading,
    reload,
  };
};

export default useMatchCardDesign;
