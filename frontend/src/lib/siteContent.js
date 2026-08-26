import { useEffect, useMemo, useState } from 'react';
import api from './api';

/**
 * Editable homepage editorial copy (Phase 15).
 * Every entry here is admin-editable via /admin/home-content.
 * System/UI labels (loading, error, navigation, aria) are intentionally NOT included.
 */
export const SITE_CONTENT_ENTRIES = [
  // Hero fallback (used when no published banner exists)
  { key: 'home.hero.eyebrow', group: 'Hero', label: 'Hero — Eyebrow', value: '{club} Football Club' },
  { key: 'home.hero.line1', group: 'Hero', label: 'Hero — Baris 1', value: 'SATU KLUB.' },
  { key: 'home.hero.line2', group: 'Hero', label: 'Hero — Baris 2', value: 'SATU SEMANGAT.' },
  { key: 'home.hero.line3', group: 'Hero', label: 'Hero — Baris 3 (emas)', value: 'SATU {club}.' },
  { key: 'home.hero.meta', group: 'Hero', label: 'Hero — Deskripsi', value: 'Bersama berjuang. Bersama menang.', multiline: true },
  { key: 'home.hero.cta_matches', group: 'Hero', label: 'Hero — Tombol Utama', value: 'Pertandingan Berikutnya' },
  { key: 'home.hero.cta_secondary', group: 'Hero', label: 'Hero — Tombol Sekunder', value: 'Tentang Kami' },

  // Brand pillars
  { key: 'home.pillar.club.title', group: 'Pilar Brand', label: 'Pilar 1 — Judul', value: 'Satu Klub' },
  { key: 'home.pillar.club.text', group: 'Pilar Brand', label: 'Pilar 1 — Teks', value: '{club} adalah satu klub dengan satu misi.', multiline: true },
  { key: 'home.pillar.team.title', group: 'Pilar Brand', label: 'Pilar 2 — Judul', value: 'Satu Tim' },
  { key: 'home.pillar.team.text', group: 'Pilar Brand', label: 'Pilar 2 — Teks', value: 'Satu tim. Satu skuad. Satu detak jantung.', multiline: true },
  { key: 'home.pillar.dream.title', group: 'Pilar Brand', label: 'Pilar 3 — Judul', value: 'Satu Mimpi' },
  { key: 'home.pillar.dream.text', group: 'Pilar Brand', label: 'Pilar 3 — Teks', value: 'Bermimpi bersama. Meraih bersama.', multiline: true },
  { key: 'home.pillar.glory.title', group: 'Pilar Brand', label: 'Pilar 4 — Judul', value: 'Satu Kejayaan' },
  { key: 'home.pillar.glory.text', group: 'Pilar Brand', label: 'Pilar 4 — Teks', value: 'Untuk lambang. Untuk Baraya. Untuk {club}.', multiline: true },

  // Section labels
  { key: 'home.label.match_next', group: 'Judul Section', label: 'Label — Pertandingan Berikutnya', value: 'Pertandingan Berikutnya' },
  { key: 'home.label.match_last', group: 'Judul Section', label: 'Label — Hasil Terakhir', value: 'Hasil Terakhir' },
  { key: 'home.label.news', group: 'Judul Section', label: 'Label — Berita', value: 'Berita Terbaru' },
  { key: 'home.label.news_action', group: 'Judul Section', label: 'Aksi — Berita', value: 'Semua Berita' },
  { key: 'home.label.spotlight', group: 'Judul Section', label: 'Label — Sorotan Pemain', value: 'Sorotan Pemain' },
  { key: 'home.label.spotlight_action', group: 'Judul Section', label: 'Aksi — Sorotan Pemain', value: 'Lihat Skuad' },
  { key: 'home.label.stats', group: 'Judul Section', label: 'Label — Statistik Tim', value: 'Statistik Tim' },
  { key: 'home.label.stats_note', group: 'Judul Section', label: 'Catatan — Statistik Tim', value: 'Statistik dihitung otomatis dari hasil pertandingan yang sudah selesai.', multiline: true },
  { key: 'home.label.store', group: 'Judul Section', label: 'Label — Toko Resmi', value: 'Toko Resmi' },
  { key: 'home.label.store_action', group: 'Judul Section', label: 'Aksi — Toko Resmi', value: 'Toko' },
  { key: 'home.label.gallery', group: 'Judul Section', label: 'Label — Galeri', value: 'Galeri' },
  { key: 'home.label.gallery_action', group: 'Judul Section', label: 'Aksi — Galeri', value: 'Semua Galeri' },
  { key: 'home.label.sponsors', group: 'Judul Section', label: 'Label — Sponsor', value: 'Sponsor Kami' },
  { key: 'home.label.sponsors_action', group: 'Judul Section', label: 'Aksi — Sponsor', value: 'Semua sponsor' },

  // Closing CTA band
  { key: 'home.cta.eyebrow', group: 'CTA Penutup', label: 'CTA — Eyebrow', value: 'Ikuti Perjalanan Kami' },
  { key: 'home.cta.title', group: 'CTA Penutup', label: 'CTA — Judul', value: 'Jadi bagian dari Baraya {club}' },
  { key: 'home.cta.text', group: 'CTA Penutup', label: 'CTA — Teks', value: 'Ikuti setiap matchday, cerita skuad, dan momen di lapangan bersama kami.', multiline: true },
  { key: 'home.cta.btn_matches', group: 'CTA Penutup', label: 'CTA — Tombol 1', value: 'Jadwal Pertandingan' },
  { key: 'home.cta.btn_squad', group: 'CTA Penutup', label: 'CTA — Tombol 2', value: 'Lihat Skuad' },
  { key: 'home.cta.btn_gallery', group: 'CTA Penutup', label: 'CTA — Tombol 3', value: 'Galeri' },
];

export const SITE_CONTENT_DEFAULTS = Object.fromEntries(
  SITE_CONTENT_ENTRIES.map((entry) => [entry.key, entry.value])
);

export const SITE_CONTENT_GROUPS = SITE_CONTENT_ENTRIES.reduce((groups, entry) => {
  const found = groups.find((g) => g.id === entry.group);
  if (found) found.entries.push(entry);
  else groups.push({ id: entry.group, entries: [entry] });
  return groups;
}, []);

const interpolate = (value, tokens) =>
  String(value ?? '').replace(/\{club\}/g, tokens.club || 'ALSABBAT');

/** Resolves editable copy: DB value → coded default, with `{club}` token support. */
export function useSiteText(tokens = {}) {
  const [values, setValues] = useState({});
  const club = tokens.club || 'ALSABBAT';

  useEffect(() => {
    let cancelled = false;
    api
      .get('/site-content/public')
      .then(({ data }) => {
        if (!cancelled) setValues(data?.items || {});
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const text = (key) => interpolate(values[key] ?? SITE_CONTENT_DEFAULTS[key] ?? '', { club });
    return text;
  }, [values, club]);
}

export const defaultSiteText = (key, club = 'ALSABBAT') =>
  interpolate(SITE_CONTENT_DEFAULTS[key] ?? '', { club });
