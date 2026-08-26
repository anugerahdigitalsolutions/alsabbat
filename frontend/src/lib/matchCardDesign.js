import { useCallback, useEffect, useState } from 'react';
import api from './api';

/** Sumber tunggal desain Kartu Pertandingan (site_content). */
export const MATCH_CARD_TRANSPARENCY_KEY = 'match.card.overlay_transparency';
export const MATCH_CARD_DEFAULT_TRANSPARENCY = 35;

export const clampTransparency = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return MATCH_CARD_DEFAULT_TRANSPARENCY;
  return Math.min(100, Math.max(0, Math.round(num)));
};

export const useMatchCardDesign = () => {
  const [transparency, setTransparency] = useState(MATCH_CARD_DEFAULT_TRANSPARENCY);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const { data } = await api.get('/site-content/public');
      const raw = data?.items?.[MATCH_CARD_TRANSPARENCY_KEY];
      setTransparency(raw === undefined || raw === null || raw === '' ? MATCH_CARD_DEFAULT_TRANSPARENCY : clampTransparency(raw));
    } catch (e) {
      setTransparency(MATCH_CARD_DEFAULT_TRANSPARENCY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { transparency, loading, reload };
};

export default useMatchCardDesign;
