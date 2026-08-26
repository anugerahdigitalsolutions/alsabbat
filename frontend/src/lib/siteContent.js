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
  { key: 'home.pillar.team.text', group: 'Pilar Brand', label: 'Pilar 2 — Teks', value: 'Satu tim. Satu perjuangan. Satu detak jantung.', multiline: true },
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
  { key: 'home.label.spotlight_action', group: 'Judul Section', label: 'Aksi — Sorotan Pemain', value: 'Lihat Pemain' },
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
  { key: 'home.cta.text', group: 'CTA Penutup', label: 'CTA — Teks', value: 'Ikuti setiap matchday, cerita pemain, dan momen di lapangan bersama kami.', multiline: true },
  { key: 'home.cta.btn_matches', group: 'CTA Penutup', label: 'CTA — Tombol 1', value: 'Jadwal Pertandingan' },
  { key: 'home.cta.btn_squad', group: 'CTA Penutup', label: 'CTA — Tombol 2', value: 'Lihat Pemain' },
  { key: 'home.cta.btn_gallery', group: 'CTA Penutup', label: 'CTA — Tombol 3', value: 'Galeri' },

  // Club page
  { key: 'club.header.label', group: 'Halaman Klub', label: 'Header — Label', value: 'Tentang Klub' },
  { key: 'club.header.title', group: 'Halaman Klub', label: 'Header — Judul', value: 'Inilah {club}' },
  { key: 'club.header.description', group: 'Halaman Klub', label: 'Header — Deskripsi', value: 'Identitas, nilai, dan perjalanan resmi klub.', multiline: true },
  { key: 'club.identity.title', group: 'Halaman Klub', label: 'Judul — Identitas Klub', value: 'Identitas Klub' },
  { key: 'club.about.title', group: 'Halaman Klub', label: 'Judul — Profil Singkat', value: 'Profil Singkat' },
  { key: 'club.story.title', group: 'Halaman Klub', label: 'Judul — Cerita Klub', value: 'Cerita Klub' },
  { key: 'club.facts.title', group: 'Halaman Klub', label: 'Judul — Fakta Klub', value: 'Fakta Klub' },
  { key: 'club.squad.title', group: 'Halaman Klub', label: 'Judul — Pemain', value: 'Satu Klub. Satu Tim.' },
  { key: 'club.squad.text', group: 'Halaman Klub', label: 'Teks — Pemain', value: '{club} hanya memiliki satu tim yang membela lambang klub.', multiline: true },
  { key: 'club.squad.cta', group: 'Halaman Klub', label: 'Tombol — Lihat Pemain', value: 'Lihat Pemain' },
  { key: 'club.honours.title', group: 'Halaman Klub', label: 'Judul — Prestasi', value: 'Prestasi Klub' },

  // Halaman Pemain (route internal tetap /teams)
  { key: 'squad.header.label', group: 'Halaman Pemain', label: 'Header — Label', value: 'PEMAIN' },
  { key: 'squad.header.title', group: 'Halaman Pemain', label: 'Header — Judul', value: 'Satu Tim. Satu Baraya.' },
  { key: 'squad.header.description', group: 'Halaman Pemain', label: 'Header — Deskripsi', value: 'Satu klub, satu tim — para pemain dan staf yang membela lambang {club}.', multiline: true },
  { key: 'squad.spotlight.label', group: 'Halaman Pemain', label: 'Label — Sorotan Pemain', value: 'Sorotan Pemain' },
  { key: 'squad.staff.label', group: 'Halaman Pemain', label: 'Label — Tim Pendukung', value: 'Tim Pendukung' },

  // Contact page
  { key: 'contact.header.label', group: 'Halaman Kontak', label: 'Header — Label', value: 'Kontak' },
  { key: 'contact.header.title', group: 'Halaman Kontak', label: 'Header — Judul', value: 'Hubungi {club}' },
  { key: 'contact.header.description', group: 'Halaman Kontak', label: 'Header — Deskripsi', value: 'Informasi kontak resmi yang tercatat pada konfigurasi klub.', multiline: true },
  { key: 'contact.info.title', group: 'Halaman Kontak', label: 'Judul — Informasi Kontak', value: 'Informasi Kontak' },
  { key: 'contact.social.title', group: 'Halaman Kontak', label: 'Judul — Media Sosial', value: 'Media Sosial' },
  { key: 'contact.note', group: 'Halaman Kontak', label: 'Catatan Kontak', value: 'Informasi kontak dikelola melalui konfigurasi klub sehingga selalu konsisten di seluruh website.', multiline: true },

  // Other public list pages
  { key: 'matches.header.label', group: 'Halaman Lain', label: 'Pertandingan — Label', value: 'Jadwal & Hasil' },
  { key: 'matches.header.title', group: 'Halaman Lain', label: 'Pertandingan — Judul', value: 'Setiap Laga. Setiap Momen.' },
  { key: 'matches.header.description', group: 'Halaman Lain', label: 'Pertandingan — Deskripsi', value: 'Jadwal, hasil, dan Pusat Pertandingan {club} Football Club.', multiline: true },
  { key: 'news.header.label', group: 'Halaman Lain', label: 'Berita — Label', value: 'Ruang Berita' },
  { key: 'news.header.title', group: 'Halaman Lain', label: 'Berita — Judul', value: 'Cerita Dari {club}' },
  { key: 'news.header.description', group: 'Halaman Lain', label: 'Berita — Deskripsi', value: 'Kabar resmi klub, laporan pertandingan, dan pengumuman.', multiline: true },
  { key: 'gallery.header.label', group: 'Halaman Lain', label: 'Galeri — Label', value: 'Media' },
  { key: 'gallery.header.title', group: 'Halaman Lain', label: 'Galeri — Judul', value: 'Momen yang Kami Ingat' },
  { key: 'gallery.header.description', group: 'Halaman Lain', label: 'Galeri — Deskripsi', value: 'Album dokumentasi pertandingan, latihan, dan kegiatan klub.', multiline: true },
  { key: 'store.header.label', group: 'Halaman Lain', label: 'Merchandise — Label', value: 'Toko' },
  { key: 'store.header.title', group: 'Halaman Lain', label: 'Merchandise — Judul', value: 'Pakai Lambang Klub' },
  { key: 'store.header.description', group: 'Halaman Lain', label: 'Merchandise — Deskripsi', value: 'Produk resmi {club} Football Club.', multiline: true },

  // Member card design (background dikelola lewat Admin → Baraya → Desain Kartu Member)
  { key: 'member.card.background_url', group: 'Kartu Member', label: 'Latar Kartu (URL gambar)', value: '', multiline: true },
  { key: 'member.card.label', group: 'Kartu Member', label: 'Kartu — Label', value: 'Kartu Member Digital' },
  { key: 'member.card.tagline', group: 'Kartu Member', label: 'Kartu — Tagline', value: 'Satu Klub. Satu Tim.' },
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
