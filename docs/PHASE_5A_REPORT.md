# ALSABBAT — Phase 5A Report: Cinematic UI & Visual Enhancement

Status: **COMPLETED** (frontend-only; backend Fase 1–4 tidak diubah)

## A. Hero
- Komponen baru `src/components/public/CinematicHero.js` (tanpa library carousel eksternal).
- Full-width, tinggi responsif `min-h 540px → 600px → 660px`, overlay gradient diagonal
  (`rgba(34,34,34,.92) → .28`) + stadium glow + pitch lines agar teks tetap kontras.
- **Autoplay 6000ms**, crossfade **800ms** (`.als-hero-slide`, hanya `opacity`/`transform`),
  ken-burns lembut 9s pada slide aktif.
- Kontrol: prev, next, tombol pause/play, pagination dots (dot aktif melebar), counter
  `01 / 03`; swipe mobile (threshold 48px); keyboard `ArrowLeft`/`ArrowRight`; autoplay
  pause saat hover/focus.
- Slide dibangun **hanya dari data nyata**: Matchday (upcoming), Latest Result (skor final),
  Latest News, Match Moments (album published). Tidak ada data pertandingan fiktif.
- Media priority: `match_cover` → cover album published (Fase 4, via `cover_url_resolved`) →
  thumbnail berita; bila tidak ada media, hero memakai fallback brand gradient + pesan aman.
- Stats strip klub (tim/pemain/pertandingan/prestasi) tetap ada di bawah hero.

## B. Visual System
- Hook baru `useScrollReveal` + `usePrefersReducedMotion` (IntersectionObserver, tanpa dependency).
- Token/kelas motion baru di `index.css`: `.als-hero-slide`, `.als-kenburns`, `.als-lift`,
  `.als-reveal-hidden`, `.als-reveal-shown` (melanjutkan `.als-reveal`, `.als-media-tile`,
  `.als-media-overlay` dari Fase 4).
- Micro interaction: lift + shadow pada CTA/kartu, image zoom pada kartu pemain/berita/galeri,
  overlay fade, dot pagination melebar, panah "Semua …" melebar saat hover.
- Semua animasi hanya `transform`/`opacity`; tidak ada `transition: all`;
  `prefers-reduced-motion` dihormati (reveal langsung tampil, ken-burns & autoplay dimatikan).

## C. Homepage
- Hero cinematic (baru) menggantikan hero statis; `HeroClubShell` lama dibiarkan utuh (tidak dihapus).
- `SectionShell` kini punya scroll reveal per section (fade-up berurutan saat masuk viewport).
- **Matchday premium**: kartu `MatchFeatureCard` (Next Match & Full Time) dengan ALSABBAT vs
  opponent, skor, tanggal/jam/venue, CTA **View Match** → `/matches/:matchId`.
- **Latest News**: kartu dengan lift + image zoom (CMS tidak diubah).
- **Squad**: kartu pemain dengan nomor punggung, overlay hover, zoom, tetap informatif di mobile.
- **Gallery Highlight**: memakai `AlbumCard` Fase 4 + endpoint `/api/gallery/public/albums`.
- Achievements, Sponsors, Social section dipertahankan (hanya mendapat reveal + hover halus).

## D. Gallery (Fase 4 dipakai, bukan dibuat ulang)
Homepage kini membaca album **PUBLISHED** dari `/api/gallery/public/albums`
(cover resolved, jumlah foto/video, relasi match) — dipakai untuk section “Galeri Terbaru”
dan sebagai sumber media hero. Album DRAFT tetap tidak muncul.

## E. Performance
- Slide pertama `loading="eager"` + `fetchpriority="high"`; slide lain `loading="lazy"`,
  `decoding="async"`.
- Thumbnail dipakai bila tersedia; tidak ada video background/autoplay; tidak ada preload media.
- Section di bawah fold hanya beranimasi saat masuk viewport (IntersectionObserver, observer
  di-unobserve setelah reveal).
- Production build: `yarn build` sukses (bundle CSS ~6.5kb tambahan, tanpa library baru).

## F. Accessibility
- Hero: `role="region"`, `aria-roledescription="carousel"`, `tabIndex=0`, dots `role="tab"` +
  `aria-selected` + label deskriptif, tombol punya `aria-label`, target ≥44px.
- Keyboard: panah kiri/kanan mengganti slide; semua kontrol fokusable dengan ring fokus.
- `alt` text pada gambar hero/berita/pemain/album; teks putih di atas overlay gelap untuk kontras.
- `prefers-reduced-motion` mematikan autoplay & ken-burns.

## G. Backward Compatibility
- Backend **tidak diubah sama sekali** pada fase ini (0 file backend dimodifikasi).
- Fase 1 (auth/RBAC/CRUD), Fase 2 (halaman publik & admin), Fase 3 (Match Center), Fase 4
  (Gallery & Media) tetap berjalan; header tetap tanpa akses admin, footer tetap punya
  **Staff Access**; SEO (`usePageSeo`, title/description/canonical/OG) tidak disentuh.

## H. Verification (minimal, Testing Agent TIDAK dijalankan)
- `yarn build` → PASS. `esbuild` lint bundle → PASS (tanpa error CSS/JS).
- `GET /api/health` → `ok`, database connected.
- Homepage render + hero: counter `01 / 03`, 3 gambar slide, next/prev mengganti headline
  (`ALSABBAT 3 — 1 Rival FC` → `ALSABBAT Wins The Opener`), pause/play, dots.
- Swipe (TouchEvent) mengganti slide; keyboard ArrowRight mengganti slide.
- Gallery highlight memakai album PUBLISHED (dev-only, sudah dihapus) dan hero memakai cover
  album tersebut sebagai media.
- Match card → `/matches/:matchId` (skor `3 - 1` tampil), halaman `/gallery` & `/news` normal.
- Admin authentication (`POST /api/auth/login`) → 200.
- Regression: `test_core_phase1.py` **60/60**, `test_match_center_phase3.py` **20/20**,
  `test_gallery_phase4.py` **25/25**.
- Semua data development-only untuk verifikasi sudah dihapus (album publik = 0, tidak ada
  media `DEV` tersisa).

## I. Scope (belum dibangun)
Match formation visual, player/match statistics, live match, social publishing
(Instagram/TikTok/YouTube/Shorts), merchandise, cart, checkout, payment, orders, membership,
ticketing — semuanya **tidak** dibangun pada Fase 5A. Tidak ada UI multi-team.

## J. Rekomendasi fase berikutnya (belum dimulai)
1. **Fase 5B — Inner Page Polish**: terapkan bahasa visual cinematic ke halaman Matches,
   News detail, Teams/Player detail, Club.
2. **Formation pitch visual** (`Match.formation` + `MatchLineup.pitch_slot`).
3. **Match & player statistics** dari data events/lineups.
4. **Social publishing module** di atas arsitektur Media yang sudah ada.
