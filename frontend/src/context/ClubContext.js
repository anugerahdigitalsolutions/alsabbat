import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { applyDefaultSeo } from '../lib/seo';
import { brandText } from '../lib/brand';

const ClubContext = createContext(null);

/** Mandatory AL SABBAT brand defaults (used until the API provides overrides). */
export const BRAND_DEFAULTS = {
  primary_color: '#FCCF2B',
  secondary_color: '#012891',
  tertiary_color: '#000000',
  light_color: '#FEFEFE',
};

export function ClubProvider({ children }) {
  const [club, setClub] = useState(null);
  const [meta, setMeta] = useState(null);
  const [seo, setSeo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [clubRes, metaRes, seoRes] = await Promise.all([
        api.get('/club/active'),
        api.get('/system/meta'),
        api.get('/seo/settings'),
      ]);
      setClub(clubRes.data?.club || null);
      setMeta(metaRes.data || null);
      setSeo(seoRes.data || null);
    } catch (e) {
      setError('Tidak dapat memuat konfigurasi klub.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Runtime brand token override from centralized club configuration
  useEffect(() => {
    if (!club) return;
    const root = document.documentElement;
    root.style.setProperty('--club-primary', club.primary_color || BRAND_DEFAULTS.primary_color);
    root.style.setProperty('--club-secondary', club.secondary_color || BRAND_DEFAULTS.secondary_color);
    root.style.setProperty('--club-tertiary', club.tertiary_color || BRAND_DEFAULTS.tertiary_color);
    root.style.setProperty('--club-light', club.light_color || BRAND_DEFAULTS.light_color);
  }, [club]);

  useEffect(() => {
    if (!seo) return;
    applyDefaultSeo({
      title: brandText(seo.title),
      description: brandText(seo.description),
      image: seo.open_graph?.image,
      canonical: seo.canonical_url,
      siteName: brandText(seo.open_graph?.site_name),
      robots: seo.robots,
    });
  }, [seo]);

  const value = useMemo(
    () => ({
      club,
      meta,
      seo,
      loading,
      error,
      reload: load,
      colors: {
        primary: club?.primary_color || BRAND_DEFAULTS.primary_color,
        secondary: club?.secondary_color || BRAND_DEFAULTS.secondary_color,
        tertiary: club?.tertiary_color || BRAND_DEFAULTS.tertiary_color,
        light: club?.light_color || BRAND_DEFAULTS.light_color,
      },
      clubName: brandText(club?.name) || 'AL SABBAT Football Club',
      shortName: brandText(club?.short_name) || 'AL SABBAT',
    }),
    [club, meta, seo, loading, error]
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export function useClub() {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used inside ClubProvider');
  return ctx;
}
