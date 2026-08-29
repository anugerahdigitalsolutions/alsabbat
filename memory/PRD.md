# ALSABBAT Football Club — PRD (living document)

## SANITIZER + SLUG SPONSOR + SPONSOR UTAMA (29 Agu 2026) · SELESAI
### File yang berubah
- `backend/app/services/media_service.py` — urutan sanitizer diperbaiki: cek magic executable (MZ/ELF di
  offset 0) → sniff signature → **Pillow verify + re-encode** untuk gambar; pemindaian cuplikan
  `<script>/<html>/<?php` kini HANYA untuk berkas NON-gambar (PDF/dokumen/video) yang tidak di-re-encode.
- `backend/app/models/domain.py` — `SponsorBase` +`slug` (auto dari nama, slugify, unik) +`is_featured`;
  `SponsorUpdate` mendapat validator slugify (slug yang sudah ada TIDAK pernah diubah otomatis).
- `backend/app/api/routes/sponsors.py` — `unique_fields=("slug",)`, filter `is_featured`, endpoint
  `GET /api/sponsors/by-slug/{value}` (menerima slug BARU **atau** id LAMA).
- `frontend/src/components/public/SponsorsStrip.js` — helper `sponsorPath()` (slug → fallback id) +
  baris **Sponsor Utama** (tile & logo lebih besar) di atas sponsor biasa; posisi section tidak berubah.
- `frontend/src/pages/public/SponsorsPage.js`, `SponsorDetailPage.js` — URL slug + lookup by-slug/id.
- `frontend/src/pages/admin/AdminSponsorsPage.js` — field **Slug URL** (opsional, otomatis) + switch
  **Sponsor Utama** + kolom Slug & Utama di tabel.
- Skrip baru: `scripts/media_sanitizer_verify.py`, `scripts/p2_sponsor_slug_media_verify.py`,
  `scripts/sponsor_slug_backfill.py` (dry-run + `--apply`, hanya MENAMBAH slug).
### Root cause sanitizer
Pemindaian cuplikan `<script>/<html>/<?php` dijalankan sebagai **substring pada 2 KB pertama berkas
mentah** — data terkompresi PNG/JPEG (atau blok metadata) bisa memuat urutan byte itu secara kebetulan,
sehingga gambar sah ditolak "konten tidak aman untuk media". Untuk gambar, mitigasi sebenarnya adalah
**re-encode Pillow** (payload apa pun ikut hilang), jadi pemindaian mentah tidak diperlukan dan hanya
menghasilkan false positive. Validasi keamanan lain tetap utuh: MIME allowlist, batas ukuran,
signature/content sniffing, penolakan executable, Pillow verify, SVG tetap dilarang.
### Verifikasi (tanpa Testing Agent)
- `scripts/media_sanitizer_verify.py` → **13/13 PASS**; `scripts/p2_sponsor_slug_media_verify.py` → **23/23 PASS**
  (upload nyata PNG transparan/JPEG/PNG ber-metadata HTML diterima & payload hilang di server;
  HTML-berkedok-jpg, SVG, executable, berkas kosong ditolak; slug otomatis, GET via slug & id,
  duplikat 409, slug stabil saat nama berubah, slug manual dinormalisasi, filter `is_featured`).
- UI 1440/768/390: tile utama 160/160/128 px vs biasa 96 px, logo utama 112/112/72 px vs 56 px,
  `object-fit: contain` dengan rasio = rasio asli (4.29 & 0.38), section tetap di bawah 4 pilar,
  overflow **0 px**, `href` memakai slug, `/sponsors/{id}` lama tetap membuka profil, **0 console error**.
- `yarn build` sukses. Sponsor uji dihapus (sponsors = 2 milik user); backfill slug menambahkan
  `sponsor-wide` & `sponsor-tall` tanpa mengubah data lain.

## SPONSOR PROFILE + BADGE STORE HITAM (29 Agu 2026) · SELESAI
### File yang berubah
- `backend/app/models/domain.py` — `SponsorBase` +`contact: ContactInformation` +`social_media: SocialLinks`,
  `description` max 1000 → 4000. **Additive & backward-compatible** (dokumen sponsor lama tanpa field ini
  tetap terbaca, `contact: None` ditangani di frontend). Tidak ada koleksi/endpoint/RBAC baru.
- `frontend/src/pages/admin/AdminSponsorsPage.js` — field baru: Alamat, Telepon, Email, Instagram,
  Facebook, TikTok, YouTube (+ label "Deskripsi / Detail Sponsor"). Logo tetap MediaPicker existing.
- **BARU** `frontend/src/pages/public/SponsorDetailPage.js` (`/sponsors/:sponsorId`, id sponsor = stabil).
- `frontend/src/App.js` — rute profil sponsor.
- `frontend/src/components/public/SponsorsStrip.js` — logo → `<Link>` profil internal (bukan website
  eksternal), `object-contain`, posisi/layout di beranda TIDAK diubah (tetap di bawah 4 pilar).
- `frontend/src/pages/public/SponsorsPage.js` — kartu sponsor → profil internal ("Lihat Profil →").
- `frontend/src/components/public/PublicFooter.js` — badge Google Play & App Store gaya **HITAM**
  (bg #000, teks putih, 152×48, radius 8px, glyph Google Play 4 warna resmi + Apple putih);
  fungsi klik & popup "Segera hadir, aplikasi masih dalam pengembangan" tidak berubah, tanpa URL eksternal.
### Verifikasi (tanpa Testing Agent)
- Admin: 7 field baru render, isi → Simpan → buka ulang → semua nilai tersimpan, logo tetap.
- API: create sponsor lengkap (contact + 4 sosial) tersimpan; sponsor lama tanpa field baru tetap terbaca
  (data user SPONSOR WIDE / SPONSOR TALL utuh).
- Publik: beranda 5 logo (di bawah pilar), klik → `/sponsors/{id}`; kartu daftar sponsor `href=/sponsors/{id}`
  (0 tautan eksternal); profil menampilkan logo/nama/tier/deskripsi/website/alamat/telepon/email/4 sosial;
  sponsor minimal → panel Informasi & baris kosong tidak dirender.
- Footer: kedua badge `rgb(0,0,0)` 152×48, popup identik pada keduanya.
- Responsive: overflow **0 px** di 390/768/1440; rasio logo = rasio asli (4.29 = 4.29, `object-fit: contain`).
- **0 console error**; `yarn build` sukses (hanya warning lama `PlayerStatsBoard.js`).
- Semua data uji sponsor dihapus → sponsors = 2 (milik user).
### Catatan / keterbatasan
- Sponsor pada **Kartu Pertandingan** digambar di **canvas** (gambar hasil unduh) → logo tampil tetapi
  **tidak bisa diklik**; klik ke profil hanya mungkin di HTML (beranda & halaman sponsor). Layout kartu
  pertandingan tidak diubah sama sekali.

## P1 — GALERI GOOGLE DRIVE (navigasi folder + lazy loading) · 29 Agu 2026 · SELESAI (butuh API key untuk e2e nyata)
### Yang dibuat/diubah
- `backend/app/services/drive.py` (+`browse_folder`, `_ancestor_path`, `_get_meta`, `_image_item`;
  `list_folder_images` LAMA tidak diubah → album lama tetap kompatibel).
- `backend/app/api/routes/gallery.py`: endpoint publik baru
  `GET /api/gallery/public/albums/{id}/drive-browse?folder_id=&page_token=&page_size=`.
- BARU `frontend/src/components/public/gallery/DriveFolderBrowser.js` (breadcrumb, folder, grid,
  infinite scroll, lightbox preview/share/download).
- `frontend/src/pages/public/GalleryDetailPage.js`: album ber-`drive_folder_url` memakai browser baru
  (fetch "semua foto sekaligus" dihapus).
- `frontend/src/pages/public/GalleryPage.js`: menu GALERI = daftar album (AlbumCard), tidak lagi
  memuat foto Drive semua album sekaligus. `AlbumCard.js`: label "Foto dari Google Drive".
### Perilaku
- Satu query Drive per folder (`orderBy=folder,name_natural`) → subfolder + foto dalam satu pageToken.
- `page_size` = kolom grid × 10 baris (mobile 20 / tablet 30 / laptop 40 / desktop 50), maks 100.
- Batch berikutnya hanya via IntersectionObserver (sentinel) + tombol manual sebagai fallback.
- Grid `aspect 4/3` + `object-contain` → ukuran seragam, tidak gepeng, tidak terpotong.
- Thumbnail `sz=w800` di grid, `sz=w1920` hanya saat preview dibuka.
- Keamanan: `folder_id` wajib turunan folder album (validasi lewat `parents`) → API key server tidak
  bisa dipakai menelusuri folder Drive lain (`FORBIDDEN_SCOPE`). Cache 5 menit per (folder, token).
- Link album yang menunjuk satu FILE gambar → foto langsung ditampilkan (`is_file`).
### Verifikasi (tanpa Testing Agent)
- `scripts/p1_drive_browse_verify.py`: **29/29 PASS** (Drive API di-stub): folder/subfolder rekursif,
  breadcrumb, 120 foto lewat 3 batch tanpa duplikat, page_size, folder kosong, folder luar album ditolak,
  link foto langsung, cache, link invalid, tanpa API key → NOT_CONFIGURED.
- Endpoint nyata: 200 (NOT_CONFIGURED, karena key belum diisi), album tidak ada → 404, page_size 500 → 422.
- UI (album uji + Drive dimock di browser): Sorotan beranda → folder → subfolder → foto (breadcrumb
  3 level), GALERI → album → folder/foto, album langsung foto, infinite scroll 50→100 (token benar),
  1 request per folder, kolom 2/3/4/5 dengan page_size 20/30/40/50, rasio tile 1.33, overflow 0 px di
  390/768/1100/1920, preview full-res (naturalWidth 1200), Download & Share ada, Escape menutup,
  tombol back browser mengikuti breadcrumb, **0 console error**. `yarn build` sukses.
- Album/data uji sudah dihapus (albums = 0).
### KETERBATASAN (blocker e2e)
- `GOOGLE_DRIVE_API_KEY` **belum ada** di environment pod ini (`backend/.env` tidak memuatnya) →
  belum bisa diuji dengan folder Drive nyata. Endpoint melaporkan `NOT_CONFIGURED` secara jujur.
- Google Drive API tidak menyediakan jumlah total item folder → UI menampilkan "N dimuat", bukan total.

## P0 FIX — Slot Foto Pemain & Staf tidak bergeser (28 Agu 2026) · SELESAI
- Akar masalah terakhir: `frontend/src/components/admin/ResourceManager.js` memakai `.filter(Boolean)`
  pada field `type: 'gallery'` di `buildInitialValues` (load form) dan `preparePayload` (submit),
  sehingga slot kosong `""` dibuang → foto Slot 3 bergeser ke Slot 1.
- Perbaikan: load form kini **pad ke `max` slot** (`['', '', url]`); submit **mempertahankan posisi**
  dan hanya memangkas kosong di ekor (kompatibel dengan data lama yang rapat).
- Backend (`normalise_gallery`) & `MediaGalleryField.js` sudah benar sebelumnya → tidak diubah.
- Verifikasi (tanpa Testing Agent): `scripts/p0_gallery_slots_verify.py` **13/13 PASS**
  (slot1 kosong+slot3 terisi, reload tetap, slot1+slot3, hapus slot1 tak menggeser slot3,
  ganti slot2 saja, maks 3 slot, data lama rapat identik, semua kosong → `[]`, pemain & staf).
- Verifikasi UI (screenshot Admin → Players → Edit): sebelum simpan Slot1/2 kosong & Slot3 bergambar;
  setelah **Simpan + buka ulang** tetap Slot3 (`Galeri Foto — 1/3`), DB `['', '', '<url>']`.
- `yarn build` sukses. Data uji dihapus kembali. Galeri Google Drive **belum dikerjakan** (menunggu instruksi user).

## Original problem statement
Membangun platform digital resmi ALSABBAT Football Club (FARM stack: FastAPI + React + MongoDB)
secara bertahap per fase, dengan identitas brand ketat:
- Font: **Poppins only**
- Warna: `#FCCF2B` (gold), `#012891` (blue), `#222222` (dark), `#FEFEFE` (light)
- Bahasa UI: Indonesia. Bahasa komunikasi user: Indonesia.
- Admin tidak boleh tampil di header; hanya "Staff Access" di footer.
- Tidak boleh membuat data dummy/fake untuk mengisi UI → gunakan empty state bersih.

## Architecture
- Backend: `/app/backend/app` — FastAPI, routes di `api/routes/`, model domain `models/domain.py`,
  JWT + RBAC, media storage lokal (`/api/media/files/...`).
- Frontend: `/app/frontend/src` — React + Tailwind + shadcn/ui.
  - `components/public/` komponen publik (CinematicHero, SectionShell, PublicPageHeader, MatchCardShell, NewsCardShell, Reveal)
  - `components/public/matchcenter/` Match Center (Scoreboard, InfoPanel, Lineup, Timeline, Media, Gallery)
  - `hooks/useScrollReveal.js` (`useScrollReveal`, `usePrefersReducedMotion`), `hooks/usePageSeo.js`
  - Design tokens & animasi: `src/index.css`

## Status per fase
| Fase | Lingkup | Status |
|---|---|---|
| 1 | Backend foundation, auth, RBAC | SELESAI |
| 2 | Official website + SEO | SELESAI |
| 3 | Match Center V1 (lineup, events, detail) | SELESAI |
| 4 | Match Gallery & Media Management | SELESAI |
| 5A | Cinematic UI homepage | SELESAI |
| 5B | Inner Page Visual Polish | SELESAI |
| 5C | Single-Team Data Cleanup | SELESAI |
| 5D | Production Data Cleanup | SELESAI |
| 5E | Production Identity & Auth Cleanup | SELESAI — Fase 5 tuntas |
| 6 | Match Intelligence (Formation, Statistics, Countdown, Spotlight) | SELESAI |
| 7 | Real Data & Content Readiness | SELESAI — STOP GATE 7 |
| 8 | Social Publishing | **SELESAI (25 Jun 2026)** — STOP GATE 8 |
| 9 | Merchandise & Commerce | SELESAI (25 Jun 2026) — STOP GATE 9 |
| 10 | Production Finalization | **SELESAI (26 Jun 2026)** — STOP GATE 10 |
| 11 | Final Feature Completion & Experience Polish | **SELESAI (26 Jun 2026)** — STOP GATE 11 |
| 12 | UI/UX Redesign & Visual Showcase | **SELESAI (26 Jun 2026)** — STOP GATE 12 |
| 12B | Exact UI Visual Correction (referensi user) | **SELESAI (26 Jun 2026)** — STOP GATE 12B |
| 12C | Full Website Visual Consistency | **SELESAI (26 Jun 2026)** — STOP GATE 12C |

## Fase 12C — Full Website Visual Consistency (2026-06-26)
Laporan lengkap: `/app/docs/PHASE_12C_REPORT.md`. Frontend-only; backend/API/database **0 perubahan**.
- Diterapkan lewat **shared components**, bukan rewrite tiap halaman: `.als-container` diselaraskan dengan frame
  homepage (max-w 1400px), `PublicPageHeader` jadi **navy cinematic rounded** (dipakai 13 halaman inner),
  header/footer/frame 12B dipakai global, `NotFoundPage` jadi panel navy + CTA gold, `SquadShowcase` diberi prop `limit`.
- Judul editorial sesuai referensi: Matches "Every Match. Every Moment.", News "Stories From ALSABBAT",
  Squad "One Squad. One Family.", Gallery "Moments We Remember", Merchandise "Wear The Badge",
  Contact "Connect With ALSABBAT", Club "This Is ALSABBAT".
- `TeamsPage` ditulis ulang menjadi **Squad page** (Player Spotlight + grid pemain per posisi + tim pendukung) →
  menghapus pola multi-team terakhir & memperbaiki bug empty state yang bergantung pada daftar team.
- Verifikasi: build 246.87 kB gz tanpa warning; overflow **0 px** di 1440/1280/390 pada 10 route + 5 halaman detail;
  brand scan 0 `#222222`/`#1A1A1A`; 0 `transition: all`; 0 wording multi-team; Staff Access subtle (header kanan + footer bawah).
- Demo preview di database sekali-pakai `alsabbat_ui_demo` → **di-drop**; produksi bersih (teams 1, clubs 1, users 1, sisanya 0).

## Fase 12B — Exact UI Visual Correction (2026-06-26)
Laporan lengkap: `/app/docs/PHASE_12B_REPORT.md`. Frontend-only; backend/database tidak diubah.
- **Page frame premium**: outer soft-white + frame putih rounded 30px (max-w 1400px) — alignment header/hero/konten konsisten.
- **Header** compact 72px: logo kiri, nav tengah 8 menu dengan underline gold, **ikon Search**, **pill gold Staff Access**
  di kanan (tanpa tautan Admin Panel). **Search dialog nyata** ke `/content/posts`, `/players`, `/matches` (parameter `search`).
- **Hero navy cinematic** rounded: headline 3 baris "ONE CLUB. / ONE PASSION. / ONE ALSABBAT." (baris ke-3 gold),
  CTA gold + outline, baris Follow Us (sosial nyata), **floating glass Next Match panel** dengan crest–VS–crest +
  countdown live (responsif, tidak overlap di 390px). Slider/autoplay/keyboard/swipe/reduced-motion tetap.
- **Pillar strip** 4 kartu putih ikon kotak gold; **Upcoming Match + Latest News** dua kolom editorial;
  **Player Spotlight + Team Stats 2×2 + Official Store**; **gallery strip 5 tile**; sponsors strip; CTA band navy;
  **footer terang** (Quick Links 2 kolom, Contact Us, Follow Us, Staff Access paling bawah).
- Aturan data dipatuhi: **klasemen & ticketing tidak dibuat** (belum ada model/fitur → tidak ada dummy/tombol palsu),
  Official Store hanya muncul bila katalog berisi produk, Team Stats `—` bila belum ada hasil pertandingan.
- Verifikasi: build 246.3 kB gz **tanpa warning**; overflow 0 px di 1920/1440/390; 14 route render; search 11 hasil nyata;
  brand scan 0 `#222222`/`#1A1A1A`; 0 `transition: all`; 0 wording multi-team.
- Demo preview di database sekali-pakai `alsabbat_ui_demo` → **di-drop**; produksi tetap bersih (teams 1, clubs 1, users 1, sisanya 0).

## Fase 12 — UI/UX Redesign & Visual Showcase (2026-06-26)
Laporan lengkap: `/app/docs/PHASE_12_REPORT.md`. Frontend-only; backend/database tidak diubah.
- Homepage redesign total mengikuti komposisi referensi user: hero cinematic 640/760px + panel Next Match
  kaca (countdown live), quick stats strip 5 kolom (angka nyata, `—` bila kosong), pillar strip
  One Club/One Team/One Dream/One Glory, About (teks + gambar besar), Matchday, Newsroom (featured + list),
  Squad (spotlight + kartu premium), Match Moments (tile besar + thumbnail), Honours timeline,
  Sponsors, Social, CTA band "Follow The Journey".
- Header premium (74px, label `Tim` → **Squad**, admin tidak muncul), footer navigasi 2 kolom dengan
  **Staff Access tetap subtle di baris paling bawah**.
- Design tokens baru: `als-btn-gold/ghost/blue` (pill), `als-glass`, `als-hero-frame`, `als-display-xl`,
  `als-tile` (hover zoom), `als-scrim-bottom`, `als-hairline`; spacing section dinaikkan.
- Brand audit: **0** `#222222`/`#1A1A1A`/`rgba(34,34,34)` di seluruh JS/CSS (24 file diperbaiki ke `#000000`).
- Reuse penuh: CinematicHero, MatchdayCountdown, PlayerSpotlight, Match Center, Gallery/MediaService,
  News CMS, Merchandise, Social Publishing, SEO, Reveal — tanpa arsitektur kedua & tanpa dependency baru.
- Verifikasi: build 245.27 kB gz tanpa warning; 16 route publik + admin login render; overflow 0 px di
  1920/1440/390; hero slider (autoplay/dots/counter/keyboard/swipe/reduced-motion) utuh.
- Demo content dijalankan di **database sekali-pakai** `alsabbat_ui_demo`, lalu **di-drop**;
  database produksi kembali bersih (teams 1, users 1, clubs 1, sisanya 0, `demo:true` = 0).

## Fase 11 — Final Feature Completion & Experience Polish (2026-06-26)
Laporan lengkap: `/app/docs/PHASE_11_REPORT.md`. Additive; Fase 1–10 tidak dirombak; tanpa data dummy.
- **Social Publishing final UI**: sumber konten eksplisit (Berita/Match Report, Pertandingan, Album, Merchandise,
  manual) yang mengisi caption/judul + `match_id`; platform tetap independen; preview diperkaya
  (status per platform termasuk NOT_SELECTED/NOT_CONFIGURED, thumbnail media, blok YouTube + indikator Shorts);
  field deskripsi YouTube. Arsitektur/idempotency/retry Fase 8 tidak diubah.
- **Player Season Statistics** (derived, tanpa model baru): `GET /api/players/{id}/statistics` dari
  MatchLineup + MatchEvent + Match + Season; musim tanpa event → `null` (bukan 0 palsu);
  section "Statistik Musim" + season selector di `/players/:id`.
- **Head-to-Head** (derived dari `matches`, tanpa koleksi baru): `GET /api/matches/{id}/head-to-head`
  + disertakan di `relations` (0 request tambahan); W/D/L, gol, 5 pertemuan terakhir; empty state jujur.
- **Match Report** memakai CMS existing: field additive `posts.post_type`
  (ARTICLE/MATCH_REPORT/ANNOUNCEMENT) + filter/kolom/field Admin + `relations.match_report`
  → CTA hanya muncul bila report published tertaut match.
- **Share Matchday**: Web Share API, WhatsApp, Copy Link (tanpa klaim auto-post Instagram Story).
- **Auto Score Card**: `MatchScoreCardGenerator` berbasis Canvas (tanpa dependency baru), 1:1 & 9:16,
  data nyata match, crest adaptif anti-overlap, Download PNG + Share file.
- **Polish**: label opsi match terbaca di Admin (`adminOptions.js` + `labelFn`), `useRemoteOptions`
  distabilkan (hentikan fetch berulang), footer sidebar diperbarui.
- **SEO bug diperbaiki**: `ClubContext` sebelumnya menimpa SEO per halaman → kini `applyPageSeo`
  (prioritas halaman) vs `applyDefaultSeo`; 7 halaman publik mendapat SEO; cart/checkout/order/404 `noindex`.
- Verifikasi: build 242.2 kB gz tanpa warning, logic check pada database sekali-pakai (di-drop otomatis),
  verifikasi visual pada database sementara lalu dikembalikan → **database produksi tetap bersih**.
- BLOCKER: kredensial sosial media & Midtrans, domain final (Fase 12).

## Fase 10 — Production Finalization (2026-06-26)
Laporan lengkap: `/app/docs/PHASE_10_REPORT.md`. Additive & minimal; Fase 1–9 tidak dirombak.
- Source hygiene: 0 secret ter-commit, `.env.example` backend/frontend diperbarui akurat (payments + social
  tokens riil + flag baru), `#222222` sisa di dokumentasi diganti `#000000`, **tidak ada file/skrip/test dihapus**.
- Security: CORS produksi anti-`*` (fail fast), security headers middleware (+HSTS di produksi),
  `/api/docs` tertutup di produksi (`ENABLE_API_DOCS`), rate limiting **MongoDB-backed** untuk
  login/checkout/webhook (collection `rate_limits` + TTL, fallback in-memory), media `.svg/.html`
  disajikan sebagai attachment (anti stored-XSS).
- Payments: status pembayaran tidak pernah dipercaya dari redirect — rekonsiliasi via Midtrans Status API
  resmi (`/v2/{order_id}/status`, signature diverifikasi) pada Lacak Order & admin order detail;
  apply status disatukan → idempotent, stok berkurang tepat sekali.
- SEO: origin publik dari `PUBLIC_SITE_URL` → header proxy (canonical kini https), `robots.txt` frontend
  di-generate saat build dari env, favicon.svg + manifest.webmanifest brand-compliant ditambahkan.
- Deployment: TTL index `rate_limits`, index `social_publications` baru; Vercel/Railway config diverifikasi;
  `yarn build` sukses (234.95 kB gz).
- Verifikasi manual (tanpa Testing Agent): health, headers, login, 429 rate limit, CORS produksi,
  webhook signature palsu ditolak, path traversal, endpoint publik & terproteksi, SEO, render halaman publik.
- BLOCKER (NOT VERIFIED): domain final, kredensial Midtrans & sosial media, Atlas cluster, HTTPS produksi.

## Fase 8 — Social Publishing (2026-06-25)
Dokumentasi lengkap: `/app/docs/SOCIAL_PUBLISHING.md`.
- Backend additive: `models/social.py`, `services/social/{base,validation,website,instagram,tiktok,youtube,registry}.py`,
  `api/routes/social.py` (prefix `/api/social`), collection `social_publications`,
  permission baru `social:read` (+ `social:publish` existing) untuk role SOCIAL_MEDIA_ADMIN.
- Adapter API resmi: Website (CMS existing), Instagram Graph API (container → status poll → media_publish),
  TikTok Content Posting API v2 (PULL_FROM_URL; Direct Post bila `TIKTOK_DIRECT_POST_APPROVED=true`,
  jika tidak → inbox upload), YouTube Data API v3 (refresh token → resumable upload), YouTube Shorts
  (endpoint YouTube yang sama + validasi ≤180 detik & vertikal/persegi).
- Satu dokumen publikasi per platform → status independen (DRAFT/QUEUED/PUBLISHING/PUBLISHED/FAILED/CANCELLED),
  idempotency (tidak bisa publish dua kali), batas 5 attempt, retry manual, cancel, audit log tanpa kredensial.
- Frontend: `pages/admin/AdminSocialPage.js` (dashboard status platform, composer: post + media library +
  caption + judul/visibility/tags, platform checkbox tanpa default, preview, publish/retry/hapus) +
  route `/admin/social` + item sidebar. Publik tidak berubah.
- Semua kredensial hanya dari environment; tanpa kredensial platform melaporkan NOT_CONFIGURED
  (tidak pernah fake success). Bundle frontend bersih dari secret.



## Fase 7 — Real Data & Content Readiness (2026-06-25)
Audit kesiapan Admin Panel untuk menerima data ALSABBAT yang nyata. **Tidak ada data dummy dibuat.**
- Gap ditemukan & ditutup: form Admin → Matches belum punya field `formation` (padahal Visual Formation Fase 6
  membacanya), `opponent_formation`, `referee`, `attendance` → ditambahkan (backend `MatchBase` sudah mendukung,
  0 perubahan backend). Admin → Club ditambah `social_media.twitter` & `social_media.website`.
- Terverifikasi sudah siap tanpa perubahan: Club profile (nama, short name, deskripsi, logo URL, kontak,
  email/telp/WA/alamat, website, sosial, lokasi, stadion, 4 brand color, SEO), Media Library (`POST /api/media/upload`
  auth-protected), logo klub otomatis dipakai Header/Footer/Hero/Admin sidebar via `ClubCrestMark`,
  scoreboard & match card (`club.logo`), SEO/OG (`usePageSeo` fallback ke `club.logo`);
  Players (nama, foto, nomor, posisi, bio, status, sosial), Staff, Seasons, Competitions (+relasi season),
  Matches, Match Lineups (role/position/pitch_slot/shirt_number/is_captain/display_order → siap untuk pitch),
  Match Events, Content/News (judul, slug, thumbnail, konten, kategori, penulis, status, tanggal, match terkait,
  SEO), Gallery (album + match + cover + publish) & Media, Sponsors.
- Single-team: teams = 1 (ALSABBAT), public UI tanpa teks multi-team.
- Empty state profesional di semua halaman publik & modul admin (dashboard menampilkan 1 team, sisanya 0).



## Fase 5B — yang diimplementasikan (2026-06-25)
- `index.css`: token/utility baru `als-inner-header`, `als-gold-rule`, `als-scrim`, `als-zoom`,
  `als-jersey-ghost`, `als-live-dot`, `als-prose`, keyframe `als-pulse` (opacity/transform only).
- `PublicPageHeader.js`: header inner page 220–330px, gold accent rule, breadcrumb, meta row,
  optional real background image + scrim, staggered reveal.
- Komponen baru satu-satunya: `components/public/Reveal.js` (wrapper scroll-reveal reusable).
- `MatchCardShell.js`: crest tim, gold accent bar, score chip dark/gold, LIVE pulse dot, CTA Match Center, hover lift.
- `MatchesPage.js`: header baru + meta counter, grid 1→2→3, staggered reveal.
- `MatchScoreboard.js`: hero cinematic + **real match media** sebagai background (jika album published),
  score 4xl→6xl gold, separasi Home/Away · Opponent, gold rule, staggered reveal.
- `MatchTimeline.js`: timeline premium dengan color code (GOAL/penalti & kartu kuning = gold,
  kartu merah/own goal = red, substitusi = blue, lainnya = neutral), minute badge dark/gold.
- `MatchDetailPage.js`: hero image dari `match_media`, reveal per kolom, back link 44px.
- `NewsPage.js` + `NewsCardShell.js`: featured headline card (2 kolom), grid 1→2→3, image zoom hover, brand fallback.
- `NewsDetailPage.js`: hero image + scrim di header, meta bar (tanggal/penulis), tipografi artikel `als-prose`
  (max-w 46rem, leading 1.85), related match card, related news grid.
- `TeamsPage.js`: single-team aware (1 tim → 1 hero card besar, bukan grid multi-team semu).
- `TeamDetailPage.js`: PlayerCard premium (portrait 224–256px, gradient overlay, jersey badge gold,
  position label ID), grid 1→2→3→4, staf card lift.
- `PlayerDetailPage.js`: hero cinematic khusus (portrait besar, ghost jersey number, gold rule, breadcrumb),
  fact grid, biografi, status panel.
- Backend changes: **0**.

## Fase 6 — Match Intelligence (2026-06-25) — FRONTEND ONLY, backend changes = 0
Semua fitur dihitung/dirender dari API existing (`/api/matches/:id/relations`, `/api/matches`, `/api/players`).
- **Visual Formation** — `components/public/matchcenter/FormationPitch.js` (baru): pitch CSS (garis tengah,
  center circle, penalty box) + marker pemain (foto/inisial, nomor, kapten). Baris pitch dibentuk dari
  `match.formation` (4-3-3 / 4-4-2 / 3-5-2 dst, parsing dinamis); fallback grouping by `position` jika formation
  kosong/invalid → label "Formasi belum tersedia". Substitutes di section terpisah. Starting XI < 11 diberi catatan
  jumlah nyata (tanpa pemain palsu). Tab Match Detail "Susunan Pemain" → "Formasi".
- **Match Statistics** — `MatchStatistics.js` (baru): dihitung dari MatchEvent (goals, own goals, assists,
  penalty missed, yellow/red cards, substitutions; club vs lawan) + Starting XI/Substitutes count dari MatchLineup.
  Baris hanya muncul bila datanya ada. Possession/shots/corners/fouls/offsides/pass accuracy **tidak dibuat**
  karena tidak ada sumber data. Tab baru "Statistik".
- **Matchday Countdown** — `MatchdayCountdown.js` (baru): kickoff = `match.date` + `match.time` pada zona WIB
  (+07:00, konvensi existing project); real-time per detik; setelah kickoff → badge "MATCHDAY"; status
  LIVE/POSTPONED/CANCELLED/FINISHED dihormati (tanpa mengubah status). Dipakai di Homepage (Matchday) dan
  sidebar Match Detail untuk match upcoming.
- **Player Spotlight** — `PlayerSpotlight.js` (baru) + `pickSpotlightPlayer` deterministik (prioritas: ada foto →
  ada nomor punggung → nomor terkecil → id). Tampil di section Squad homepage, CTA ke `/players/:id`.
- Brand: seluruh komponen baru memakai #000000 (bukan #222222); overlay `rgba(34,34,34,…)` di HomePage diganti
  `rgba(0,0,0,…)`. Animasi memakai `Reveal`/`useScrollReveal`/`als-lift`/`als-zoom` existing.
- Verifikasi logika (node, tanpa menyentuh DB): parsing formasi 4-3-3/4-4-2/3-5-2/invalid, fallback posisi,
  starting XI parsial, kickoff WIB, dan seleksi spotlight — semuanya sesuai ekspektasi.
- Catatan: rendering dengan DATA NYATA belum bisa diverifikasi (DB sengaja kosong; dilarang membuat dummy data).


## Fase 5E — Production Identity & Auth Cleanup (2026-06-25)

- Auth: 6 akun test `content<timestamp>@alsabbat.com` (CONTENT_ADMIN) dihapus + 6 session miliknya direvoke.
  Tersisa 1 akun resmi `admin@alsabbat.com` (SUPER_ADMIN). JWT/bcrypt/RBAC/middleware TIDAK diubah.
  Sessions: 36 → 30 (hanya session akun test yang dihapus). Analytics tidak disentuh (259 events).
- Club identity: description → "Official website of ALSABBAT Football Club.";
  `stadium`/`location` yang di-inject test ("ALSABBAT Arena"/"Indonesia") dikosongkan (tidak mengarang fakta).
- Brand: dark resmi kini **#000000** (bukan #222222) — `index.css` `--club-tertiary`, `ClubContext.js`,
  `AdminClubPage.js` default, `models/domain.py` default, `services/bootstrap.py`, dan dokumen club di DB.
- Copy multi-team: `AdminTeamsPage.js` ("beberapa tim: first team, reserve, youth…") diganti wording single-team;
  `bootstrap.py` DEFAULT_CLUB tidak lagi menyebut "multiple teams". Public UI bersih dari teks multi-team.
- Skrip: `scripts/phase5e_cleanup.py` (dry-run + `--apply`).

## Fase 5D — Production Data Cleanup (2026-06-25)
Setiap kandidat dicocokkan dengan signature test eksplisit (nama/slug bertimestamp, `cdn.example.com`,
`pitch.png` 67 byte). Tidak ada record di luar signature yang dihapus.
- BEFORE → AFTER: teams 1→1, players 7→0, staff 7→0, matches 7→0, lineups 0→0, events 0→0,
  posts 13→0, albums 6→0, media 20→0, seasons 7→0, competitions 7→0, categories 7→0, authors 7→0,
  tags 7→0, sponsors 6→0, clubs 1→1 (config ALSABBAT dipertahankan).
- Storage: 7 file `*-pitch.png` (67 byte, artefak upload test) dihapus; `media_storage` kini 0 file.
  Tidak ada direktori/bucket yang dihapus.
- Integrity check: 0 orphan pada player→team, staff→team, match→team, lineup, event, post→match,
  album→match, album→cover, media→album.
- Skrip: `scripts/phase5d_audit.py` (read-only), `scripts/phase5d_cleanup.py` (dry-run + `--apply`).
- UNRESOLVED (sengaja dipertahankan): 6 user CONTENT_ADMIN test `content<timestamp>@alsabbat.com`
  (auth/RBAC — butuh persetujuan user), 35 session, 259 analytics_events (data runtime, bukan konten).
- Catatan copy: deskripsi club masih "Built for multiple teams…" — perlu diperbarui user via Admin Panel.

## Fase 5C — Single-Team Data Cleanup (2026-06-25)
Aturan bisnis: **ALSABBAT = 1 club, 1 team, 1 squad.** Entity `Team` tetap dipertahankan untuk relasi/scalability,
tetapi DATA hanya boleh berisi satu team aktif bernama `ALSABBAT`.
- Audit: 14 team (semua hasil test-run berulang: `First Team <timestamp>`, `Youth Team <timestamp>`).
- Konsolidasi: relasi di-repoint ke team kanonik `fa1680d3…` (players 6, staff 6, matches 6, posts 6),
  lalu 13 team dev dihapus. Team kanonik di-rename `ALSABBAT` / short `ALSABBAT`.
- Bootstrap backend (`services/bootstrap.py`) TIDAK pernah membuat team → tidak ada auto-generation saat restart/deploy.
  Sumber polusi = `/app/tests/test_core_phase1.py`; test kini memakai team existing + membuat & MENGHAPUS
  satu "QA Temp Team" saja (idempotent, tidak meninggalkan team dev).
- Frontend: label kategori `FIRST_TEAM` dihilangkan dari UI publik (`/teams` → "Football Club", `/teams/:id` → "Squad").
- Skrip: `scripts/phase5c_audit.py` (read-only), `scripts/phase5c_cleanup.py` (dry-run + `--apply`).
- Unresolved (TIDAK dihapus, butuh keputusan user): 7 player duplikat "A. Sabbat #10", 7 staf, 7 match vs "Rival FC",
  13 post, 6 album galeri, 20 media — semuanya artefak test-run, bukan data produksi nyata.


- `yarn build` → Compiled successfully (221 kB gz).
- `/api/health` → ok, database connected.
- Render OK: `/matches`, `/matches/:id` (+ 3 tab), `/news`, `/news/:slug`, `/teams`, `/teams/:id`, `/players/:id`, `/gallery`.
- Match card clickable → Match Center; media panel Fase 4 tetap berfungsi; admin login API 200.
- Mobile 390px: tidak ada horizontal overflow.
- Timeline color-coding **belum terlihat dengan data nyata** (DB belum punya match events) — empty state tampil benar.
- Testing Agent TIDAK dijalankan (permintaan user, hemat credit).

## Backlog
### P0
- **Fase 12 — Final Production Deployment**: MongoDB Atlas → Railway → Vercel → domain → CORS →
  Storage/CDN → Midtrans → Instagram/TikTok/YouTube → HTTPS → final smoke test → GO LIVE.
### P1
- Route-level code splitting halaman admin (perf; butuh perubahan struktur App.js)
- Audit log administratif & 2FA Super Admin
### P2
- Membership, ticketing, signed URL untuk media privat

## Koreksi Final — Staff Access (26 Jun 2026)
- Pill "Staff Access" DIHAPUS dari PublicHeader.js (header kanan atas), import ikon Lock dibersihkan.
- "Staff Access" TETAP hanya di baris paling bawah PublicFooter.js, subtle (rgba(0,0,0,0.38)).
- Tidak ada Admin Panel di navigasi publik (PUBLIC_NAV/SECONDARY_NAV/mobile menu).
- Backend, auth/RBAC, API, DB, deployment TIDAK diubah. Tidak ada data dummy.
- Verifikasi: yarn build sukses; desktop 1920 & mobile 390 -> header staff access absent, footer staff access present; POST /api/auth/login admin@alsabbat.com berhasil (token SUPER_ADMIN).

## Bahasa Indonesia + Login Baraya ALSABBAT (26 Jun 2026)
- Seluruh UI publik diterjemahkan ke Bahasa Indonesia (nav, hero, section label, empty state, Match Center -> Pusat Pertandingan, Merchandise/Cart/Checkout/Lacak Pesanan, footer). Admin Panel TIDAK diubah.
- Istilah komunitas: "keluarga ALSABBAT" -> "Baraya ALSABBAT" (JourneyCta, PillarStrip, TeamsPage).
- Login Baraya ALSABBAT: rute /login + /daftar (BarayaLoginPage.js, BarayaRegisterPage.js) + integration point src/services/barayaAuth.js (BARAYA_AUTH_ENABLED=false). TIDAK ada fake auth, TIDAK ada backend baru.
- Header kanan atas: pill "Login" + keterangan "Login untuk Baraya ALSABBAT" (xl+), mobile menu punya entri "Login untuk Baraya ALSABBAT". Staff Access tetap hanya di baris paling bawah footer.
- Verifikasi: yarn build sukses; desktop 1920 & mobile 390 (header tanpa Staff Access, footer ada Staff Access, pill Login tampil); tidak ada kata "keluarga" tersisa; /login & /daftar 200; POST /api/auth/login admin 200.
- BACKLOG: backend auth Baraya (koleksi customers, JWT terpisah), checkout dengan akun, riwayat pesanan, profil.

## FASE 13 — Baraya ALSABBAT Account & Customer Commerce (26 Jun 2026)
### Backend (additive)
- Koleksi baru: `customers`, `customer_sessions` (+index unique email/id, jti). Password bcrypt (rounds 12), tidak pernah plaintext, tidak pernah keluar di response.
- JWT Baraya terpisah: claim `typ="baraya"` via `create_customer_access_token` (exp default 1440 menit, env CUSTOMER_TOKEN_EXPIRE_MINUTES). Admin JWT tidak diubah.
- `app/api/deps.py`: `get_current_customer` (tolak token admin), `optional_customer`.
- `app/api/routes/customers.py` -> prefix `/api/baraya`: register, login, logout, me (GET/PATCH), change-password, orders, orders/{id}, admin/list, admin/{id}/status.
- Rate limit: login_guard (existing), register 8/jam, profil 20/10mnt, password 10/15mnt. Validasi server-side + email normalization + password policy (8+, huruf+angka).
- Orders dapat `customer_id` saat checkout dengan token Baraya (REUSE endpoint checkout existing, cart/stock/Midtrans tidak diduplikasi).
### Frontend
- `lib/api.js`: `barayaApi` + `barayaTokenStore` (localStorage key `alsabbat.baraya.token`) terpisah dari token admin.
- `context/BarayaAuthContext.js`, `services/barayaAuth.js` (BARAYA_AUTH_ENABLED=true), `components/public/BarayaRoute.js`.
- Halaman: /login, /daftar, /akun, /akun/pesanan, /akun/pesanan/:orderId. Header: dropdown akun (Akun Saya / Pesanan Saya / Keluar) saat login, pill Login + keterangan saat belum login. Staff Access tetap hanya di footer.
- Checkout: prefill nama/email/WA dari profil, banner Baraya, guest checkout tetap jalan.
- Admin Panel: `/admin/baraya` (lihat + aktif/nonaktif, tanpa akses password) memakai permission existing user:read / user:write.
### Verifikasi (tanpa Testing Agent)
- scripts/phase13_verify.py 27/27 PASS; scripts/phase13_checkout_verify.py 9/9 PASS. Semua data throwaway dihapus (customers=0, customer_sessions=0, orders=0, products=0).
- yarn build OK, backend import OK, admin login 200, /admin/login 200, mobile 390px tanpa overflow.
### Limitasi
- Belum ada verifikasi email / reset password / OAuth. Order guest lama tidak otomatis terhubung ke akun Baraya. Ongkir masih flat 0 (kebijakan klub).

## FASE 14 — Lupa & Reset Kata Sandi Baraya (26 Jun 2026)
### Discovery (perbedaan dengan rancangan)
- TIDAK ada mailer/email service di repo (hanya media_service, payments, social). Dibuat abstraksi baru `app/services/mailer.py` dengan provider SMTP (nyata) / LOG (default, tanpa kirim) / MEMORY (khusus test). Tidak ada provider dikarang.
- URL reset memakai `settings.PUBLIC_SITE_URL` (config existing), bukan domain hardcode.
### Perubahan
- `app/core/config.py`: MAIL_PROVIDER, MAIL_FROM, MAIL_FROM_NAME, SMTP_*, PASSWORD_RESET_TOKEN_EXPIRE_MINUTES (30).
- `app/core/database.py`: koleksi `customer_password_resets` + index token_hash (unique), customer_id, expires_at.
- `app/models/customer.py`: CustomerForgotPasswordRequest, CustomerResetPasswordRequest (aturan password Fase 13 di-reuse).
- `app/api/routes/customers.py`: POST /api/baraya/forgot-password, POST /api/baraya/reset-password.
- `app/services/mailer.py` (baru).
- Frontend: /lupa-password, /reset-password (BarayaForgotPasswordPage.js, BarayaResetPasswordPage.js), link "Lupa Kata Sandi?" di /login, service barayaForgotPassword/barayaResetPassword, rute di App.js.
### Keamanan
- Token: secrets.token_urlsafe(32), disimpan sebagai SHA-256 (plaintext hanya di email), expiry 30 menit, sekali pakai (find_one_and_update atomik), semua token lain milik customer di-invalidate setelah reset.
- Response forgot-password selalu generik; tidak ada kebocoran email terdaftar/status/customer_id. Rate limit forgot 5/15mnt, reset 10/15mnt.
- Reset berhasil -> revoke SEMUA customer_sessions milik customer; session admin & guest checkout tidak tersentuh. `users`/RBAC/`/api/auth/*` tidak diubah.
### Verifikasi (tanpa Testing Agent)
- `scripts/phase14_verify.py`: 46/46 PASS — in-process app, DB sandbox `alsabbat_phase14_sandbox` (di-DROP di akhir), mailer MEMORY (0 email nyata).
- Frontend Playwright (API di-mock, 0 write produksi): link login, generic success, invalid-token state, validasi mismatch, redirect ke /login, token tidak masuk localStorage/sessionStorage, mobile 390px tanpa overflow.
- yarn build PASS, backend import PASS, health 200, 12 rute publik/admin 200. DB produksi: customers/sessions/resets/orders/products = 0, users = 1 (tidak berubah).
### Limitasi
- MAIL_PROVIDER default LOG -> di produksi wajib set MAIL_PROVIDER=SMTP + SMTP_* + MAIL_FROM agar email benar-benar terkirim.

## FASE 15 — Content Management Completion (Kategori-C) — 26 Jun 2026 · STOP GATE 15
### Backend (additive, Fase 1–14 tidak diubah)
- Model baru `app/models/site.py`: `BannerBase/BannerUpdate/Banner`, `SiteContentBase/SiteContentUpdate/SiteContent`, `SiteContentBulkRequest`.
- Koleksi baru: `banners` (index id unik, status+display_order), `site_content` (index key unik, group).
- Route baru `app/api/routes/site.py`:
  - `GET /api/banners/public` — hanya status ACTIVE + dalam jadwal (`starts_at`/`ends_at`, zona WIB), urut `display_order`, plus `image_resolved` (Media Library id → url, fallback `image_url`).
  - `GET /api/banners/preview` — permission `content:write`, termasuk draft (untuk Admin Preview).
  - CRUD `/api/banners` (write permission `content:write`, tanpa perubahan RBAC).
  - `GET /api/site-content/public` — map `{key: value}` 1 request.
  - `PUT /api/site-content/bulk` — upsert idempotent; value kosong → row dihapus → frontend memakai default.
  - CRUD `/api/site-content` (key unik, pola `^[a-z0-9._-]+$`).
### Frontend
- `lib/siteContent.js`: 36 key editorial homepage (Hero fallback, Pilar Brand, Judul Section, CTA Penutup) + hook `useSiteText` (DB → default kode, token `{club}`). Label sistem/UI (loading, error, navigasi, aria) TIDAK di-CMS-kan.
- `lib/banners.js`: `bannerToSlide` — mapper tunggal dipakai homepage DAN Admin Preview (renderer identik `CinematicHero`).
- `HomePage.js`: banner CMS jadi sumber hero; bila kosong → fallback ALSABBAT existing. Semua label section/statistik note memakai `t()`.
- `PillarStrip.js`, `JourneyCta.js`: teks dari `t()` dengan default = teks Indonesia sebelumnya (layout Fase 12C tidak berubah).
- Admin: `/admin/home-content` = menu "Konten Homepage" (Media & Konten) dengan 2 tab — **Banner Hero** (`components/admin/BannerManager.js`: ResourceManager + tombol Preview Hero) dan **Konten Situs** (`components/admin/SiteContentForm.js`: form per grup, placeholder = teks default, tombol "Default" per field, simpan sekali via bulk).
### Verifikasi (tanpa Testing Agent)
- `scripts/phase15_verify.py`: **38/38 PASS** pada DB sandbox `alsabbat_phase15_sandbox` (auth, publish/draft, jadwal tampil, resolusi gambar Media Library & URL, preview permission, urutan, hapus, bulk upsert idempotent, hapus key → default, validasi key, konflik duplikat, 6 regresi endpoint publik) → sandbox **DI-DROP**.
- E2E UI: login admin → buat banner ACTIVE → Preview Hero → edit `home.cta.title` → homepage menampilkan banner + teks baru (Admin → API → DB → Homepage). Data uji **dihapus kembali**; produksi: banners 0, site_content 0, users 1, teams 1, clubs 1, sisanya 0.
- `yarn build` sukses tanpa warning (255.75 kB gz); overflow 0 px di 1920 & 390; brand #FCCF2B/#012891/#000000/#FEFEFE, Poppins, "Baraya ALSABBAT", Staff Access hanya di footer, Login Baraya tetap kanan atas.
### Limitasi
- Video background hero belum didukung (sesuai keputusan user).
- CTA banner memakai path internal (mis. `/matches`); tautan eksternal penuh belum di-render sebagai anchor.

## FASE 16 — Production Content Experience & Club Pages (26 Jun 2026) · STOP GATE 16
### Discovery (Klub / Skuad / Kontak)
- Sudah API-driven: identitas & warna klub, deskripsi, founded/location/stadium, kontak & sosial (Club Profile), pemain & staf, sponsor, prestasi.
- Gap ditemukan: teks editorial header/section hard-coded; **tidak ada foto utama** untuk halaman Klub; **tidak ada field cerita klub**; halaman Klub masih menampilkan "Jumlah Tim" + daftar "Tim Klub" (**pelanggaran single-team**); foto staf tidak dirender; gambar konten (logo, foto pemain/staf, sponsor, thumbnail berita, cover album, trofi) hanya input URL teks.
### Backend (2 field additive saja)
- `ClubBase`: `story` (cerita klub, max 8000) + `hero_image` (foto utama, dipakai header Klub & Skuad). Tidak ada koleksi/endpoint/RBAC baru — semua lewat `/api/club` existing (`club:write`).
### Frontend
- `ResourceManager`: field type baru **`media`** = Input URL + dropdown **Media Library** (`adminOptions.mediaOptions`, menyimpan URL media). Dipakai untuk logo klub, foto utama klub, foto pemain, foto staf, logo sponsor, thumbnail berita, cover album, gambar trofi.
- `AdminClubPage`: + Logo (media), Foto Utama (media), Cerita Klub (textarea), tombol **Lihat Halaman Klub** (preview via halaman publik nyata).
- `ClubPage`: header memakai `club.hero_image`; section Identitas, Profil Singkat, **Cerita Klub** (tampil hanya bila diisi), Fakta Klub (hanya field yang ada isinya — tidak ada fakta karangan), blok **Satu Klub. Satu Tim.** (jumlah pemain/staf nyata + CTA Skuad) **menggantikan daftar multi-team**, dan **Prestasi Klub** dari `/achievements` (ACTIVE, hilang bila kosong).
- `TeamsPage`: teks header/label dari site_content, header memakai foto utama klub, kartu staf kini menampilkan **foto** + `role_label`.
- `ContactPage`: teks header/section/catatan dari site_content; data kontak tetap 100% dari Club Profile (sumber sama dengan footer).
- `site_content` diperluas +36 key → total **72 key**: Homepage (36), Halaman Klub (11), Halaman Skuad (5), Halaman Kontak (6), Halaman Lain (12: Pertandingan/Berita/Galeri/Merchandise). Label sistem/UI (loading, error, empty state, navigasi, aria, cart/checkout/akun) **tetap di kode**.
- Menu admin `/admin/home-content` di-rename **"Konten Halaman"**, tab 2 → **"Teks Halaman"** (Homepage, Klub, Skuad, Kontak, Halaman Lain). Tidak ada CMS kedua.
### Verifikasi (tanpa Testing Agent)
- `scripts/phase16_verify.py`: **34/34 PASS** di DB sandbox `alsabbat_phase16_sandbox` (**DI-DROP**): club story/hero_image/logo/kontak, RBAC (401 tanpa token), player & staff CRUD + hanya ACTIVE yang publik, foto dari Media Library, prestasi ACTIVE-only, copy Klub/Skuad/Kontak via site_content + fallback default, persistensi setelah re-read, 7 regresi endpoint publik, single-team check.
- E2E UI produksi: login admin → 11 halaman Admin render tanpa error → edit **Cerita Klub** → tampil di `/club` → tetap ada setelah refresh → **dikembalikan kosong** (produksi kembali ke kondisi awal, tidak ada data uji).
- `yarn build` Compiled successfully tanpa warning (257.36 kB gz); backend import OK; `/api/health` 200. Overflow 0 px di 1920 & 390 pada 11 route publik.
- Scan: `#222222`/`#1A1A1A`/`rgba(34,34,34` = 0; "Keluarga ALSABBAT" = 0; wording multi-team/youth/reserve = 0; Staff Access header 0 / footer 1; pill Login Baraya di header ada.
- Database produksi: banners/site_content/players/staff/media/matches/posts/albums/sponsors/achievements/products/orders/customers = 0, users 1, teams 1, clubs 1, `demo:true` = 0, tidak ada database sandbox tersisa.
### Gap yang MASIH hard-coded (disengaja, kategori B/C)
- Empty state, loading, error, aria/accessibility, navigasi, label taksonomi posisi (Penjaga Gawang/Belakang/Tengah/Depan), label fakta klub (Didirikan/Lokasi/Markas), teks Cart/Checkout/Lacak Pesanan/Login/Daftar/Akun, teks brand fallback hero.
- Halaman detail (Match Detail, News Detail, Album Detail, Player Detail) memakai label sistem + data nyata; belum ada teks editorial ber-CMS di sana.

## FASE 17 — Baraya ALSABBAT Member Card & Member Management (26 Jun 2026) · STOP GATE 17
### Discovery
- `customers` existing sudah punya: id, email, full_name, phone, status (ACTIVE/INACTIVE), created_at, last_login_at, sesi terpisah (`customer_sessions`, JWT `typ=baraya`). BELUM ada: member number, identifier publik, foto, QR. Tidak ada library QR.
### Arsitektur (additive, TIDAK ada collection/auth kedua)
- 3 field baru di `customers`: `member_number` (ALS-000001, sekuensial via `counters` `_id=baraya-member-number` + `$inc seq`, index unik sparse), `member_code` (`secrets.token_urlsafe(16)`, tak bisa ditebak, index unik sparse, HANYA untuk QR), `photo_url` (https:// atau /api/media/, divalidasi), `joined_at`.
- `app/services/membership.py`: `ensure_member_identity` (idempotent, dipanggil saat register + `/baraya/me` + member-card → akun lama otomatis ter-backfill), `member_card_payload`, `member_verification_payload`.
- Endpoint baru: `GET /api/baraya/member-card` (self-scoped), `GET /api/member/verify/{member_code}` (publik, rate-limited 60/10mnt, data minimum), `GET /api/baraya/admin/{id}/member-card` (permission `user:read`). Status memakai enum customer existing (ACTIVE/INACTIVE), tanpa RBAC baru.
### Frontend
- `components/member/MemberCard.js` = **satu-satunya renderer** (dipakai /akun, /akun/kartu, pratinjau Admin). Navy #012891 + emas #FCCF2B, Poppins, crest klub, "BARAYA ALSABBAT", nama, nomor member, foto/inisial, badge status, QR (`qrcode.react`) berisi **hanya URL verifikasi publik**.
- `/akun/kartu` (BarayaRoute): kartu + **Bagikan** (Web Share API → fallback salin tautan, jujur bila tidak didukung), **Salin Tautan**, **Simpan Kartu** (`html-to-image` → PNG lokal, tanpa upload).
- `/member/verifikasi/:code` publik: "Baraya ALSABBAT Terverifikasi" / "Keanggotaan Tidak Aktif" / "Member Tidak Ditemukan" + nomor, nama, status, bulan bergabung. Tidak menampilkan email/telepon/alamat/pesanan.
- `/akun`: section "Kartu Member Baraya ALSABBAT" + nomor + tombol Lihat Kartu; field **Foto Profil** ditambahkan ke form profil (nama/foto berubah → kartu berubah, nomor tetap).
- `/admin/baraya`: kolom **No. Member**, avatar, tombol **Kartu** (dialog pratinjau memakai renderer yang sama), toggle status existing tetap.
### Verifikasi (tanpa Testing Agent)
- `scripts/phase17_verify.py`: **39/39 PASS** di sandbox `alsabbat_phase17_sandbox` (**DI-DROP**) — M1–M15 termasuk: nomor unik & berformat, kartu self-scoped, customer B tidak bisa membuka kartu A (403), unauth 401, QR verify tanpa key sensitif & tanpa email/telepon, member_number tidak bisa dipakai sebagai identifier (anti-enumerasi), INACTIVE → verifikasi INACTIVE + tidak bisa login + akun tidak dihapus, foto/nama berubah → kartu berubah, nomor tetap, customer tidak bisa self-assign member_number/member_code/status, photo_url `javascript:` ditolak 422, admin list/preview tanpa password_hash + RBAC, checkout & riwayat pesanan member tetap jalan (payment logic tidak disentuh), isolasi token admin↔baraya, 6 regresi publik.
- E2E UI produksi: daftar → login → /akun (ALS-000001) → /akun/kartu (QR + tombol) → /member/verifikasi/{code} (tanpa kebocoran email/telepon) → /admin/baraya (kolom No. Member + pratinjau kartu). Akun uji, sesi, dan counter **dihapus kembali** → produksi bersih.
- `yarn build` Compiled successfully (272 kB gz), backend import OK, `/api/health` 200, overflow 0 px di 1920 & 390 (kartu wrap QR pada kolom sempit).
- Bug ditemukan & diperbaiki saat verifikasi: index unik `counters.id` bentrok dengan counter nomor order existing → dihapus, member counter kini memakai konvensi `_id`/`seq` yang sama.
### Catatan & batasan
- Foto profil = tautan https (belum ada upload object storage untuk customer).
- Tidak ada ticketing, poin loyalitas, diskon member, biaya membership, atau auto-post sosial (di luar scope).

## FASE 18 — Baraya Member Experience & Content Control (26 Jun 2026) · STOP GATE 18
### Discovery
Fase 17 sudah menyediakan member_number/member_code/photo_url/joined_at, renderer tunggal `MemberCard.js`, `site_content` + Media Library. Yang belum: latar kartu belum bisa diatur Admin, belum ada statistik Baraya, validasi foto masih longgar (SVG/HTML lolos).
### Yang dibuat/diubah
- BARU: `frontend/src/components/admin/MemberCardDesign.js`, `scripts/phase18_verify.py`.
- DIUBAH: `components/member/MemberCard.js` (layer latar + overlay + token teks), `lib/siteContent.js` (+grup "Kartu Member": `member.card.background_url`, `member.card.label`, `member.card.tagline`), `pages/admin/AdminBarayaPage.js` (statistik + section Desain Kartu Member), `backend/app/models/customer.py` (validasi foto), `backend/app/api/routes/customers.py` (`GET /api/baraya/admin/stats`).
### Background CMS
- Latar kartu diatur di **Admin → Baraya ALSABBAT → Desain Kartu Member**: pilih dari **Media Library** (atau tempel URL), **Simpan Latar**, **Reset ke Default**. Nilai disimpan di `site_content` key `member.card.background_url` (hanya URL — TIDAK ada binary di MongoDB). Kosong → latar default ALSABBAT (pitch lines + gradien emas).
- Overlay navy→hitam otomatis (rgba(1,40,145,0.90) → rgba(0,0,0,0.68)) agar nama/nomor/status/QR tetap kontras di latar terang maupun gelap; QR tetap di tile putih.
### Pratinjau & renderer
- `MemberCard.js` tetap **satu-satunya renderer** (dipakai /akun, /akun/kartu, dialog kartu Admin, dan pratinjau desain). Pratinjau memakai data contoh **hanya di UI**, tidak pernah masuk database.
### Statistik & foto
- `GET /api/baraya/admin/stats` (RBAC `user:read`): total, aktif, nonaktif, baru bulan ini — angka nyata dari `customers`, 0 bila kosong.
- Foto profil: tetap tautan **https://** atau `/api/media/…`; kini menolak `javascript:`, `http://`, dan ekstensi `.svg/.svgz/.html/.htm/.xml/.js`. **Upload dari perangkat untuk customer BELUM diaktifkan** (endpoint upload media memerlukan permission `media:write` admin; upload customer butuh object storage + konfigurasi deployment).
### Verifikasi (tanpa Testing Agent)
- `scripts/phase18_verify.py`: **30/30 PASS** di sandbox `alsabbat_phase18_sandbox` (**DI-DROP**) — M18-01…M18-09, validasi foto, statistik + RBAC, isolasi auth, 11 regresi endpoint, tanpa binary di DB.
- E2E UI produksi: upload gambar uji → pilih di Admin → pratinjau bergambar → Simpan → `/akun/kartu` & `/akun` memakai latar sama (`data-has-background=true`) → overflow 0 px di 1920/1024/390 → **reset ke default, media uji + berkas + akun uji + counter dihapus** (produksi kembali bersih).
- `yarn build` Compiled successfully tanpa warning (273.91 kB gz), backend import OK, `/api/health` 200, `site-content` kembali kosong.
### Limitasi
- Upload foto customer & upload latar langsung dari perangkat untuk non-admin belum ada (perlu object storage).
- "Simpan Kartu" (PNG) mengandalkan browser; latar dari domain eksternal bisa gagal dirender karena CORS — gunakan Media Library (same-origin) untuk hasil pasti.
- Tidak ada ticketing / poin / diskon member (di luar scope).

## FASE 19 — Real Content Preparation & Admin Content Workflow (26 Jun 2026) · STOP GATE 19
### Discovery
Semua resource sudah CMS-driven (Fase 15–18), field wajib sudah ada di ResourceManager (pemain: nama/posisi/status; pertandingan: lawan/tanggal/venue_type/status; berita: judul/konten/status; produk: nama/harga/status), Media Library sudah dipakai untuk semua gambar konten (Fase 16 field type `media`). Yang belum: Admin tidak punya gambaran konten mana yang belum diisi.
### Yang dibuat/diubah
- BARU: `backend/app/api/routes/readiness.py` (`GET /api/readiness/content`, permission `club:read`), `frontend/src/pages/admin/AdminReadinessPage.js`, `scripts/phase19_verify.py`.
- DIUBAH: `router.py` (+prefix `/readiness`), `AdminSidebar.js` (+menu **Persiapan Konten**), `App.js` (+route `/admin/readiness`), help text pada field media (pemain, staf, sponsor, thumbnail berita, hero klub, banner, latar kartu member).
### Content Readiness Dashboard
- 19 kategori (Profil Klub, Logo & Identitas, Foto Utama, Konten Kontak, Staf, Skuad, Musim, Kompetisi, Pertandingan, Formasi & Starting XI, Berita, Galeri, Sponsor, Prestasi, Banner Homepage, Konten Homepage, Merchandise, Desain Kartu Member, Baraya) dikelompokkan ke TAHAP 1–8.
- Aturan persen eksplisit: setiap kategori = daftar `checks` boolean dari data nyata; `percent = done/total`. Status: 0% = BELUM DIISI, 100% = SIAP, sisanya SEBAGIAN. Total 49 item. Database kosong → 8% (hanya nama/short_name/deskripsi/warna klub bawaan) — tidak ada angka karangan.
- Checklist bersifat derived (tanpa koleksi/checkbox baru), tiap kategori punya tombol **Isi Sekarang** ke route admin existing, plus panel **Urutan yang disarankan** (14 langkah + alasan, tidak memblokir).
### Media, preview, homepage
- Media Library tetap satu-satunya sumber media (field type `media` dipakai di logo/hero klub, foto pemain & staf, sponsor, trofi, thumbnail berita, cover album, banner hero, latar kartu member).
- Preview memakai renderer publik yang sama: Banner → `CinematicHero`, Kartu Member → `MemberCard.js`, Klub → tombol "Lihat Halaman Klub". Preview khusus Match/News/Album belum ada (limitasi tercatat, butuh arsitektur preview draft).
- Homepage/banner/site_content tetap Admin → API → DB → Public dengan fallback default bila kosong.
### Verifikasi (tanpa Testing Agent)
- `scripts/phase19_verify.py`: **32/32 PASS** di sandbox `alsabbat_phase19_sandbox` (**DI-DROP**, skrip menolak jalan bila DB bukan sandbox) — P19-01…P19-16 termasuk: RBAC 401, status ikut data nyata (8% → 43% setelah isi klub/pemain/staf), dashboard tidak membuat data, Media Library/Banner/site_content/latar kartu tetap bekerja, **tidak ada endpoint ticketing/seat/klasemen**, 11 regresi endpoint publik.
- Smoke UI: `/admin/readiness` (19 kartu, 19 Quick Action, navigasi ke `/admin/players` berhasil), 14 route admin tanpa error, 14 route publik tanpa error, overflow **0 px** di 1920/1440/1024/390, Staff Access hanya footer, Login Baraya di header.
- `yarn build` Compiled successfully tanpa warning (275.79 kB gz), backend import OK, `/api/health` 200.
- Database produksi tetap: users 1, teams 1, clubs 1, sisanya 0; tidak ada berkas media uji; tidak ada DB sandbox tersisa.
### Limitasi
- Upload foto Baraya dari HP **belum** diaktifkan: penyimpanan media masih provider LOCAL (disk pod, ephemeral di deployment) dan endpoint upload butuh permission admin `media:write`. Perlu object storage + konfigurasi deployment sebelum upload customer dibuka.
- Preview draft untuk Match/News/Album belum ada.
- Klasemen & ticketing tidak dibuat (future phase).
- Sisa string multi-team: hanya nilai enum backend `TeamCategory.YOUTH_TEAM` (tidak dipakai UI/data produksi), dibiarkan agar tidak merusak validasi existing.

## FASE 20 — Universal Media Upload & Storage (26 Jun 2026) · STOP GATE 20
### Storage
- `MEDIA_STORAGE_PROVIDER` sekarang mendukung **LOCAL | EMERGENT | S3** (satu abstraksi `StorageBackend`, tanpa hard-code provider).
- Provider aktif di preview: **EMERGENT** (Emergent Managed Object Storage, persisten & deployment-safe). Binary di object storage, MongoDB hanya metadata (url, mime, size, width/height, storage_key, provider). Berkas disajikan lewat `GET /api/media/files/{key}` (backend streaming) sehingga kredensial storage tidak pernah sampai ke browser.
- ENV baru (`backend/.env.example`): `MEDIA_STORAGE_PUBLIC_BASE_URL`, `MEDIA_STORAGE_BUCKET`, `MEDIA_STORAGE_REGION`, `MEDIA_STORAGE_ENDPOINT`, `MEDIA_STORAGE_PREFIX`, `EMERGENT_LLM_KEY`, `INTEGRATION_PROXY_URL`. Tidak ada credential asli di repo.
- `GET /api/media/storage/status` kini melaporkan `persistent` + catatan jujur bila masih LOCAL.
### Keamanan upload (server-side)
- Allowlist MIME (SVG **dihapus** dari daftar gambar), batas ukuran dievaluasi pada berkas **asli** sebelum re-encode, signature/magic-byte check, penolakan `<script>/<html>/<?php/MZ/ELF`, **re-encode gambar via Pillow** (JPEG/PNG) sehingga payload berbahaya tidak tersimpan mentah, storage key dibuat server-side (nama file user hanya metadata), header `X-Content-Type-Options: nosniff`, proteksi path traversal.
### Universal uploader
- Komponen tunggal `frontend/src/components/shared/MediaPicker.js`: preview, drag & drop, pilih file dari HP, progress %, Upload dari Perangkat, Pilih dari Media Library (dengan pencarian), Hapus, replace. Dipakai oleh `ResourceManager` (type `media`), `BannerManager`, `MemberCardDesign`, dan halaman Akun Baraya — tidak ada uploader kedua.
- Field yang kini upload/library (tanpa ketik URL): club logo, club hero, club OG image, foto pemain, foto staf, logo tim, logo kompetisi, logo lawan, gambar pertandingan, logo sponsor, gambar trofi, thumbnail berita, foto penulis, cover album, gambar banner hero, gambar produk (`cover_media_id`, mode id), latar kartu member, foto profil Baraya.
- Backward compatible: URL lama (`logo`, `photo`, `image_url`, `hero_image`, `background_url`) tetap dibaca & dirender; tidak ada migrasi data massal.
### Upload foto Baraya (aktif)
- `POST /api/baraya/me/photo` & `DELETE /api/baraya/me/photo` (auth Baraya existing, tanpa auth kedua): validasi + sanitasi sama, hanya foto sendiri, langsung tampil di kartu member; nomor/member_code/status tidak bisa diubah; Baraya tidak bisa upload ke Media Library admin maupun mengubah latar kartu global.
### Verifikasi (tanpa Testing Agent)
- `scripts/phase20_verify.py`: **44/44 PASS** di sandbox `alsabbat_phase20_sandbox` (**DI-DROP**, menolak jalan di non-sandbox) — upload desktop/HP, metadata & dimensi, baca ulang berkas, reuse library, tolak HTML-berkedok-JPG/SVG/executable/kosong/oversize/unauth/path-traversal, integrasi ke club/player/staff/sponsor/news/banner/product/member-card, URL lama tetap terbaca, upload+hapus foto Baraya + isolasi antar customer, soft delete media, 12 regresi endpoint.
- UI produksi: upload logo klub dari perangkat → preview → simpan (berhasil, tampil di sidebar & halaman), Media Library picker menampilkan berkas hasil upload, tombol Hapus tersedia; form players/teams/matches/competitions/sponsors/products menampilkan uploader dengan **0 input URL** tersisa; overflow **0 px** di 1920/1600/390 pada admin & publik.
- `yarn build` Compiled successfully tanpa warning; `/api/health` 200; provider status `EMERGENT/persistent: true`.
- Data uji produksi **dikembalikan**: club.logo & hero_image dikosongkan lagi, media uji dihapus (media total 0). Data nyata milik user (location "Majalengka", stadium "Babakan koda", 1 season) **tidak disentuh**.
### Limitasi
- Emergent object storage tidak punya API delete → penghapusan media = soft delete metadata (binary tetap ada di bucket, tidak dapat diakses tanpa metadata).
- Album gallery masih memakai halaman kelola album existing (pilih media dari library, upload lewat menu Media).
- Ticketing & klasemen tetap tidak dibuat.

## FASE 21 — Premium Motion, Interaction Polish & Terminology (26 Jun 2026) · STOP GATE 21
### Motion yang ditambahkan (semua transform/opacity, GPU-friendly, tanpa dependency baru)
- `index.css`: utilitas baru `.als-page-enter` (+keyframe `als-page-in`), `.als-stagger` (delay 0/40/80/120/160/200/240ms), `.als-hero-step`, `.als-card-enter` (+keyframe `als-card-in`), `.als-press` (hover lift + press feedback), `:active` press pada `.als-btn-gold/blue/ghost`, `.als-admin-table tbody tr:hover` highlight.
- **Page transition**: `PublicLayout` membungkus `<Outlet/>` dengan `key={pathname}` + `.als-page-enter` (±260ms). Back/forward, scroll reset, dan analytics tetap normal.
- **Hero cinematic**: `CinematicHero` kini bertahap — eyebrow 60ms → headline baris 1/2/3 (140/250/360ms, baris emas tetap) → subheadline 420ms → meta 480ms → tagline 520ms → CTA 580ms → sosial 640ms → panel Next Match 700ms. Crossfade 800ms `.als-hero-slide` + ken-burns existing dipertahankan, tanpa layout shift.
- **Stagger grid**: `.als-stagger` dipasang di grid Skuad, Berita, Galeri, Merchandise, dan Pertandingan (delay maks 240ms agar tidak terasa lambat).
- **Scroll reveal**: tetap memakai `Reveal` + `useScrollReveal` (IntersectionObserver, sekali reveal) yang sudah ada — tidak ada sistem kedua.
- **Micro-interaction**: tombol utama sudah lift+shadow, kini punya press feedback; tombol Kartu Member (Bagikan/Salin/Simpan) dan tombol Tambah/Simpan di ResourceManager memakai `.als-press`; kartu member masuk dengan `.als-card-enter`.
### Reduced motion & aksesibilitas
- Blok `@media (prefers-reduced-motion: reduce)` diperluas: page transition, hero step, stagger, card enter, ken-burns, dan hover-lift **dimatikan total** (`animation: none`, `opacity 1`, `transform none`), `scroll-behavior: auto`. Terverifikasi via `emulate_media`: `heroAnim=none`, `pageAnim=none`, opacity 1. Focus ring tetap terlihat (Tab → ring 2px).
### Terminologi
- "Markas" → **"Stadion"** pada UI publik (fakta klub) dan Admin (label field `stadium` + help text). Field/API/enum/nama file tidak diubah. Audit: **0 kemunculan "Markas"** di seluruh frontend.
### Verifikasi (tanpa Testing Agent)
- Overflow **0 px** untuk 8 route publik di **1920/1440/1024/390**; halaman Admin (club/players/baraya/readiness) 0 error & 0 overflow; navigasi menu + back button normal (scroll reset 0).
- Hero: 7 elemen ber-animasi; page transition wrapper terdeteksi; aturan CSS stagger ada di bundle; tidak ada console error.
- `yarn build` Compiled successfully tanpa warning (277.81 kB gz, CSS 14.9 kB); `/api/health` 200; backend tidak diubah sama sekali di fase ini.
- Audit: "Keluarga ALSABBAT" 0, `#222222/#1A1A1A/rgba(34,34,34` 0, `transition: all` 0 pada kode ALSABBAT (5 sisa hanya di primitif shadcn: toast/tabs/accordion/progress/input-otp — sengaja tidak diubah).
- Database produksi tidak disentuh; data nyata user tetap (logo klub hasil upload, Majalengka, Babakan koda, 1 musim, 2 media).

## FASE 22 — Navigation & Header Polish: CAPITAL MENU + PEMAIN (26 Jun 2026) · STOP GATE 22
### Struktur menu final (label publik CAPITAL, route tidak diubah)
- BERANDA `/` · KLUB `/club` · PEMAIN `/teams` · PERTANDINGAN `/matches` · BERITA `/news` · GALERI `/gallery` · MERCHANDISE `/merchandise` · KONTAK `/contact` · LOGIN `/login`.
- Nav sekunder (drawer mobile) juga CAPITAL: PRESTASI, SPONSOR, LACAK PESANAN.
- ≥1280px: 8 menu tampil langsung (`public-header-primary-nav`).
- 1024–1279px: 6 menu prioritas (BERANDA…GALERI) + dropdown **LAINNYA ▾** berisi MERCHANDISE & KONTAK (`public-header-compact-nav`, `public-nav-more-trigger`).
- <1024px: drawer mobile existing (Sheet) dengan semua menu + tombol LOGIN + caption "Login untuk Baraya ALSABBAT".
- Caption login desktop dipindah ke `2xl:inline` agar header tidak padat di 1280px. Staff Access tetap HANYA di footer.
### Terminologi
- "Skuad"/"Squad" yang tampil ke user → **0** (diganti "PEMAIN"/"pemain"/"tim"): PublicHeader, PublicFooter (memakai PUBLIC_NAV), TeamsPage, TeamDetailPage, PlayerDetailPage (breadcrumb + tombol kembali), SquadShowcase, StorePromoCard, HomePage empty state, `lib/siteContent.js` defaults, label admin (AdminClubPage/AdminHomeContentPage/AdminPlayersPage/SiteContentForm). Key CMS, route, testid, nama file, enum **tidak diubah**.
- "Markas" 0, "Keluarga ALSABBAT" 0 (tetap "Stadion" & "Baraya ALSABBAT").
### Aksesibilitas
- Dropdown LAINNYA memakai Radix DropdownMenu: dapat dibuka via keyboard (Enter), ArrowDown navigasi, Escape menutup — terverifikasi.
- Drawer mobile: ditambahkan `SheetTitle`/`SheetDescription` sr-only → console error a11y Radix (`DialogContent requires a DialogTitle`) hilang, Escape menutup drawer.
### Verifikasi (tanpa Testing Agent)
- Overflow **0 px** di 1920/1440/1280/1024/768/390 (+drawer terbuka di 390).
- Visibilitas nav benar: 1920/1440/1280 full nav; 1024 compact nav + dropdown; 768/390 burger.
- Semua route publik status 200 (club, teams, matches, news, gallery, merchandise, contact, login) & 0 istilah terlarang di body.
- Active underline gold tetap tanpa layout shift; motion Fase 21 dipertahankan (tidak ada animasi baru).
- Console: 0 error / 0 warning setelah perbaikan a11y; `yarn build` Compiled successfully tanpa warning.
- **Database tidak disentuh** (hanya read-only check: `site_content` 0 dokumen → default kode yang dipakai). Tidak ada data dummy, tidak ada deployment.

## FASE 23 — Admin Form UX (Dropdown Tautan) & Fixed Banner Frame (26 Jun 2026) · STOP GATE 23
### Dropdown tautan internal
- Baru: `lib/internalLinks.js` (opsi halaman + `isExternalLink`) dan `components/admin/LinkField.js`.
- `ResourceManager` mendapat `type: 'link'` → render `LinkField`: **Jenis Tautan** (Halaman Website / Tautan Eksternal); internal = dropdown nama halaman, eksternal = input `https://...`.
- Dipakai di **Banner Hero**: `cta_url` (Tombol Utama — Tautan) & `cta_secondary_url` (Tombol Sekunder — Tautan). Audit: tidak ada field admin lain yang meminta route internal manual (satu-satunya `type:'text'` ber-URL yang tersisa adalah `seo.canonical_url`, memang teks bebas).
- Mapping label→route EXISTING: Beranda `/`, Klub `/club`, **Pemain `/teams`**, Pertandingan `/matches`, Berita `/news`, Galeri `/gallery`, Merchandise `/merchandise`, Kontak `/contact`, Login `/login`, Lacak Pesanan `/order`. Tidak ada route/API baru.
- `CinematicHero` kini merender CTA eksternal sebagai `<a target="_blank" rel="noreferrer">`, internal tetap `<Link>`.
### Fixed banner frame
- `index.css`: `.als-hero-frame` dari `min-height` → **`height` tetap** (520 / 580 ≥640px / 640 ≥1024px) + `overflow:hidden` + `container-type: size`; kelas baru `.als-hero-content` (absolute inset-0, overflow hidden) dan `.als-hero-headline` (`clamp` berbasis `cqh` → headline mengecil mengikuti tinggi frame).
- `CinematicHero`: layer konten tidak lagi memakai `als-hero-frame` (tidak lagi menambah tinggi), gambar tetap `absolute inset-0 h-full w-full object-cover` + `objectPosition` dari CMS.
- Sebelum: hero 854px di 1440 (ikut konten/gambar). Sesudah: **tetap 640px** di 1024–1920, 580px di 768, 520px di 390.
### Posisi gambar (crop)
- Field baru `image_position` (backend `BannerBase`, max 20) + select Admin: Tengah (default) / Atas / Bawah / Kiri / Kanan → `object-position`. Diverifikasi end-to-end: PATCH `image_position=top` → homepage `object-position: 50% 0%`; **dikembalikan ke `center`**.
- Preview Admin tetap memakai renderer yang sama (`CinematicHero` via `bannerToSlide`) — frame 640px, `object-fit: cover` identik homepage.
### Verifikasi (tanpa Testing Agent)
- Uji gambar tanpa menulis DB (ganti `src` di DOM): portrait 900×3000, ultrawide 6000×1200, kecil 200×150, square 1000×1000, dan foto asli 6003×3998 → frame **tetap 640px**, `object-fit: cover`, tidak gepeng, overflow 0.
- Responsive 1920/1440/1280/1024/768/390: frame 640/640/640/640/580/520, overflow **0 px**, posisi section berikutnya konsisten (nextTop 758/676/608) → tidak ada layout shift.
- Admin form 1280: dropdown Jenis Tautan & Halaman berfungsi (listbox di dalam viewport), pilih "Pemain" → nilai `/teams`, ganti ke Tautan Eksternal → input `https://...` muncul, Posisi Gambar dapat dipilih, overflow 0.
- Console 0 error / 0 warning (sekaligus memperbaiki warning lama `fetchpriority` → `fetchPriority`); `yarn build` Compiled successfully tanpa warning.
- Media tetap Upload/Media Library (0 input URL untuk media); URL media lama tetap dibaca.
- Database produksi (`alsabbat_platform`) utuh: banners 1 (banner milik user), clubs 1, media 3, users 1, seasons 1, tanpa data dummy. Tidak ada deployment.

### Fase 23-P/Q — Rekomendasi ukuran gambar di setiap uploader (26 Jun 2026)
- Shared helper baru `lib/mediaHints.js` (`MEDIA_SPECS`) + prop `spec` pada `MediaPicker` → blok "Rekomendasi: <ratio> · <ukuran> px" + catatan crop, tampil langsung di bawah tombol Upload/Media Library. Satu komponen untuk semua form (bukan implementasi terpisah).
- Ratio dibaca dari frame publik nyata: banner hero **2:1 · 1920×960** (frame terukur 1328×640 @1920), kartu member **3:2 · 1200×800** (terukur 440×288), pemain/staf **4:5 · 1200×1500** (frame detail 208×256 / 256×320, tile object-top), sponsor **3:1 · 1500×500** (kartu h-24 object-contain), trofi **3:1 · 1500×500** (frame h-32), produk **4:3 · 1600×1200** (frame h-52), cover album **16:9 · 1600×900** (frame h-44), thumbnail berita **16:9 · 1920×1080**, gambar pertandingan **16:9 · 1920×1080**, logo klub/tim/kompetisi **1:1 · 1000×1000**, logo lawan **1:1 · 500×500** (h-9 w-9), foto penulis **1:1 · 800×800**, foto Baraya **1:1 · 1000×1000**, hero klub **16:9 · 1920×1080**, OG image **1.91:1 · 1200×630**.
- Terpasang di 16 field: club logo, club hero, OG image, banner hero, foto pemain, foto staf, logo tim, logo kompetisi, logo lawan, gambar pertandingan, logo sponsor, gambar trofi, thumbnail berita, foto penulis, cover album, gambar produk + Desain Kartu Member (admin) dan Foto Profil Baraya (publik).
- Hanya bantuan UI: **tidak ada validasi ratio**; upload ratio berbeda tetap diterima dan di-crop dengan `object-fit: cover` + `object-position` sesuai frame.
- Verifikasi: keterangan tampil di 13 form yang diperiksa (home-content/players/staff/teams/competitions/matches/sponsors/achievements/content/gallery/products/club/baraya), overflow 0, console 0 error/warning, `yarn build` sukses tanpa warning, banner tetap fixed frame (640/640/520 @1920/1440/390). Backend/API/storage tidak diubah; tidak ada data dummy.

### Fase 23-AE s/d AT — Universal Image Crop Editor (26 Jun 2026)
- Komponen tunggal baru `components/shared/ImageCropper.js` (**UniversalImageCropper**): dialog crop dengan frame ber-aspect ratio sesuai komponen publik, drag (pointer/mouse), touch drag + pinch zoom, tombol Zoom +/−, geser kiri/kanan/atas/bawah, Reset, indikator zoom, dan tombol Simpan Crop. Tidak ada cropper terpisah per jenis gambar.
- `MediaPicker` menerima `spec` (dari `MEDIA_SPECS`, kini juga berisi `aspect` numerik). Alur: Upload dari Perangkat **atau** Pilih dari Media Library → cropper terbuka otomatis dengan frame yang benar → geser/zoom → Simpan → hasil crop diunggah sebagai berkas BARU via `/api/media/upload` (storage Fase 20) dan dipakai oleh field. Tombol **"Sesuaikan / Crop"** selalu tersedia untuk crop ulang kapan pun (termasuk media lama / backward compatible).
- **Berkas asli tidak pernah diubah/ditimpa** — tetap ada di Media Library; crop menghasilkan derivatif baru sehingga admin bisa crop ulang tanpa upload ulang. Tidak ada perubahan backend/API/storage untuk fitur ini.
- Aspect per jenis (dibaca dari frame publik): banner 2:1, kartu member 3:2, pemain & staf 4:5, sponsor 3:1, trofi 3:1, produk 4:3, cover album 16:9, thumbnail berita 16:9, gambar pertandingan 16:9, hero klub 16:9, OG 1.91:1, logo klub/tim/kompetisi 1:1, logo lawan 1:1, foto penulis 1:1, foto Baraya 1:1.
- Verifikasi (tanpa Testing Agent, tanpa menyimpan entitas): foto landscape 3:1 → frame pemain terukur **0.8 (4:5)**, hasil crop **320×400**; foto portrait 1:3 → frame banner terukur **2.00**, hasil crop **320×160**; foto 1200×300 di sponsor (mobile 390px) → frame **3.01**, drag + simpan OK, lalu **crop ulang dari URL tersimpan** (canvas same-origin, tidak tainted) berhasil (903×301 → 753×251). Berkas asli tetap utuh di library.
- Mobile 390px: dialog & frame tidak keluar layar, overflow 0, tombol cukup besar; console 0 error/0 warning; `yarn build` sukses tanpa warning.
- Kebersihan data: seluruh media uji dihapus setelah pengujian (media kembali **3** berkas milik user), tidak ada entitas dummy (players/staff/sponsors/products tetap 0), banner & club user tidak diubah. Banner publik tetap fixed frame 640/580/520 px.

### Penyesuaian visual Banner Hero — overlay lebih tipis (26 Jun 2026)
- `CinematicHero`: gradient navy dikurangi drastis dari `rgba(1,40,145,0.96 → 0.18)` menjadi `0.60 → 0.04`; ditambah scrim hitam netral dari bawah (`0.60 → 0` sampai 64%) khusus untuk keterbacaan teks; `als-stadium-glow` opacity 60 → 30.
- Hasil: foto (wajah, jersey, rumput, stadion) dominan dan natural, nuansa navy premium tetap ada, headline putih/gold tetap kontras. Frame, crop, layout, tipografi, CTA, social icon, dan slider tidak diubah — banner tetap fixed frame 640/520 px, overflow 0, console 0 error, `yarn build` sukses.

### Overlay Banner Hero dibuat sangat tipis (26 Jun 2026)
- Layer navy: `rgba(1,40,145,0.30)` di kiri → **0 pada 62% lebar** (kanan tanpa navy sama sekali). Layer gelap netral horizontal: `rgba(0,0,0,0.42)` di kiri → 0 pada 66%. `als-stadium-glow` opacity 30 → **15**.
- Scrim bawah dipindah ke kelas `.als-hero-scrim` (index.css): desktop `0.34 → 0` (52%), mobile ≤639px sedikit lebih kuat `0.60 → 0` (90%) agar teks tetap terbaca di frame sempit.
- Foto tidak difilter/diubah (tanpa saturate/brightness/tint) — hanya layer overlay. Frame tetap 640/580/520, `object-fit: cover`, crop & posisi tidak berubah, CTA + 2 dot slider tetap ada, overflow 0 px di 1920/1440/1280/1024/768/390, console bersih, `yarn build` sukses.

### Overlay Banner Hero — level TENGAH (26 Jun 2026, final)
- Navy: `rgba(1,40,145,0.44)` kiri → `0.34` (22%) → `0.21` (46%) → `0.13` (70%) → `0.08` (kanan) — transisi bertahap, tanpa biru solid.
- Gelap netral horizontal `0.34 → 0` (70%) + `.als-hero-scrim` (desktop `0.34→0`, mobile `0.60→0`) untuk keterbacaan; glow stadion opacity 20.
- Verifikasi: frame 640/640/640/640/580/520 @1920/1440/1280/1024/768/390, `object-fit: cover`, crop/posisi tidak berubah, CTA + 2 dot slider aktif, overflow 0 px, console 0 error, `yarn build` sukses. Foto tidak difilter; DB/API/CMS tidak disentuh.

## FASE — Per-Banner Overlay Control + Live Preview (26 Jun 2026)
- Backend (additive): `BannerBase.overlay_opacity: Optional[float] (0–100)`. Tidak ada collection/migrasi baru; permission tetap `content:write`; public hanya membaca.
- `ResourceManager`: tipe field baru **`slider`** (min/max/step/suffix/defaultValue) dengan angka persen terlihat + tombol **"Gunakan Default"** (mengembalikan ke 35% — nilai default sistem; tidak menghapus data lain), serta prop baru **`formPreview(values)`** yang merender preview di dalam form.
- `BannerManager`: field "Ketebalan Overlay" (0–100%, default 35%) + **Preview Hero real-time** memakai renderer yang sama (`CinematicHero` + `bannerToSlide`) dengan seluruh nilai form (gambar, headline, subheadline, deskripsi, CTA, CTA sekunder, social, crop/posisi, overlay). Tidak ada renderer kedua.
- `CinematicHero`: konstanta `DEFAULT_OVERLAY_OPACITY = 35`; setiap slide menghitung `factor = overlay/35` lalu menskalakan seluruh stop gradient navy (0.44/0.34/0.21/0.13/0.08) dan layer gelap horizontal secara proporsional (clamp 0.92). Gradasi tetap kiri kuat → tengah sedang → kanan tipis. Scrim `.als-hero-scrim` tetap konstan untuk keterbacaan. Foto tidak difilter.
- Backward compatible: banner tanpa `overlay_opacity` (null) memakai default 35% → tampilan tidak berubah.
- Verifikasi (tanpa Testing Agent): slider 0/25/50/75/100% → gradient preview berubah real-time (0 → 0.314 → 0.627 → 0.92 clamp), "Gunakan Default" → 35% (0.44); preview frame tetap 640px, overflow 0. Persistensi via API: create overlay 72 → GET 72 → PATCH 18 → tersimpan; banner lain tetap `null`; banner INACTIVE tidak muncul di publik. **Banner uji dihapus**; produksi tetap 2 banner ACTIVE milik user dengan overlay null. Homepage 1920–390: frame 640/640/640/640/580/520, overflow 0, console 0 error, `yarn build` sukses tanpa warning.

## Ambient background corak diamond (26 Jun 2026)
- `.als-shell-bg` (dipakai HANYA oleh `PublicLayout`, bukan Admin) kini `#FEFEFE` dengan pola diamond via `::before` `position: fixed; inset:0; z-index:-1; pointer-events:none` — dua layer SVG data-URI seamless (tile 160px `fill-opacity 0.075` + tile 340px `fill-opacity 0.05`, warna `#000000`) sehingga pola tidak seragam dan tidak menghitung ukuran layout. Radial navy lama & latar `#f1f3f7` dihapus.
- Frame utama (`.als-frame`) tetap `#FEFEFE` + rounded 30px + shadow; header/hero/card/section/footer/Member Card/Admin tidak tersentuh.
- Verifikasi 1920/1440/1280/1024/768/390: overflow **0 px**, frame width 1400/1392/1232/976/768/390, pola hanya terlihat di luar frame, console 0 error, `yarn build` sukses tanpa warning. Tanpa perubahan backend/DB/CMS.

### Corak diamond dibuat lebih rapat (26 Jun 2026)
- `.als-shell-bg::before` kini memakai **3 layer** SVG data-URI seamless: tile **64px (13 diamond, opacity 0.075)**, **104px (11, 0.06)**, **168px (6, 0.05)** dengan offset `0 0, 21px 29px, 47px 11px` → kepadatan ±3–4× versi sebelumnya (tile 160px/16 + 340px/6), ukuran diamond tetap kecil-sedang (2–7px) dan tidak membentuk grid kaku.
- Opacity tidak dinaikkan (tetap 5–7,5%), warna tetap `#000000` di atas `#FEFEFE`, pattern tetap `position: fixed; z-index:-1; pointer-events:none` (di luar frame saja).
- Verifikasi 1920/1440/1280/1024/768/390: overflow 0 px, lebar frame 1400/1392/1232/976/768/390 (tidak berubah), hero & konten normal, console 0 error, `yarn build` sukses tanpa warning.
- Catatan insiden: skrip edit otomatis pernah memotong `index.css`; dipulihkan via `git checkout HEAD -- frontend/src/index.css` lalu diedit ulang dengan search_replace. Hindari edit CSS besar lewat skrip index-based.

### Background corak diamond DIBATALKAN (26 Jun 2026)
- Atas permintaan user, seluruh implementasi pattern diamond dihapus total: `.als-shell-bg::before` (3 layer SVG data-URI), `position/isolation` tambahan, dan latar `#FEFEFE` dikembalikan ke kondisi sebelumnya: `background-color: #f1f3f7` + `radial-gradient(1200px circle at 50% -10%, rgba(1,40,145,0.08), transparent 60%)`. Tidak ada asset/class/dead code pattern yang tertinggal (grep "diamond"/"fill-opacity" = 0).
- Semua fitur lain dipertahankan: overlay hero level tengah + kontrol overlay per banner, universal crop, navigasi Fase 22 (label KAPITAL + PEMAIN), logo ALSABBAT `#000000`, motion Fase 21.
- Verifikasi 1920/1440/1280/1024/768/390: `background-color rgb(241,243,247)` + radial navy kembali, pattern layers = 0, frame 1400/1392/1232/976/768/390, hero 640/640/640/640/580/520, overflow 0, console 0 error, `yarn build` sukses. DB tidak disentuh (banners 2, media 13, clubs 1).

## FASE — Background Website via CMS (26 Jun 2026)
- Tanpa perubahan backend: konfigurasi disimpan sebagai JSON string di `site_content` key **`site.background`** (via `PUT /api/site-content/bulk`, permission `content:write`), dibaca publik lewat `GET /api/site-content/public`.
- Baru: `lib/siteBackground.js` (default config, arah gradasi, ukuran/posisi gambar, `backgroundLayerStyles`, hook `useSiteBackground`), `components/public/SiteBackgroundLayers.js` (layer `fixed inset-0 pointer-events-none`, dipasang di `PublicLayout` di LUAR frame), dan `components/admin/BackgroundManager.js` (tab baru **Background Website** di Admin → Konten Halaman).
- Mode: **Warna Tunggal** (color picker + HEX + transparansi), **Gradasi** (2 warna + 5 arah + transparansi), **Gambar** (Upload/Media Library Fase 20, cover/contain/auto, posisi tengah/atas/bawah/kiri/kanan, transparansi, overlay ON/OFF + warna + transparansi). Plus switch **Gunakan Background Website** (OFF = default ALSABBAT) dan **Reset ke Default** (tidak menghapus media apa pun).
- Preview live: menampilkan mock frame website (header ALSABBAT + nav + hero + cards) dengan background di luar frame, toggle **Desktop/Mobile**, berubah real-time tanpa Simpan.
- Verifikasi: solid (#FEFEFE 10% → #012891 25%), gradasi (to right → 135deg diagonal), gambar dari Media Library (cover→contain, posisi tengah→atas 50% 0%), overlay navy 5% muncul sebagai layer kedua; save → `site.background` tersimpan; homepage menerapkan 2 layer di 1920/1440/1280/1024/768/390 dengan overflow 0, frame & hero tidak berubah (640/580/520); reset menghapus konfigurasi → homepage kembali default (`rgb(241,243,247)`), Admin kembali OFF/Warna Tunggal.
- Bonus fix: `MediaPicker` LibraryDialog diberi `DialogDescription` → warning a11y Radix hilang (console 0 error/0 warning). `yarn build` sukses tanpa warning.
- Data: konfigurasi uji dihapus (`site_content` 0 dokumen), media tetap 13 (tidak ada upload baru), banners 2 milik user. Tanpa deployment.

## FASE — Ultra Smooth Page Transition + Sticky Header (26 Jun 2026)
- Page transition: `.als-page-enter` 260ms → **420ms** dengan `--ease-page: cubic-bezier(0.22, 1, 0.36, 1)`; keyframe `als-page-in` tetap fade + `translate3d(0, 10px, 0)` → 0 (GPU-friendly: opacity + transform saja). Hanya CONTENT yang dianimasikan (`PublicLayout` key={pathname}), header di luar wrapper transisi sehingga tidak ikut bergerak.
- Sticky header FIX: penyebab header tidak sticky adalah `.als-frame { overflow: hidden }` (membuat scroll container). Diubah ke **`overflow: clip`** → sudut membulat tetap terpotong dan `position: sticky; top: 0; z-index: 50` pada `PublicHeader` bekerja di semua breakpoint.
- Visual saat scroll (>8px): `data-scrolled="true"`, background `rgba(254,254,254,0.96)` → `0.92`, shadow `0 1px 0` → `0 10px 30px rgba(0,0,0,0.10)` dengan `transition-shadow 300ms`. Tinggi/ukuran/posisi header tidak berubah.
- Drawer mobile: item menu kini `preventDefault` + `setOpen(false)` lalu `navigate()` setelah **180ms** → drawer menutup dulu, baru page transition (tidak bertabrakan).
- `html { scroll-padding-top: 88px }` agar anchor/hash tidak tertutup header sticky.
- Verifikasi: sticky `headerTop = 0` pada scrollY 1200 di 1920/1440/1280/1024/768/390 (overflow 0 semua); transisi terukur `0.42s cubic-bezier(0.22,1,0.36,1)`; navigasi berulang dari posisi tengah halaman (club→teams→matches→news→gallery) semua benar, scroll reset ke 0, header stabil; back/forward normal; dropdown LAINNYA saat scrolled tetap di dalam viewport, Enter membuka & Escape menutup; drawer mobile menutup lalu navigasi (scrollY 0, overflow 0); `prefers-reduced-motion: reduce` → `animation: none`, opacity 1, transform none, focus ring 2px tetap terlihat; console 0 error/0 warning; `yarn build` sukses tanpa warning. DB tidak disentuh.

## FASE — Favicon Management via Admin (26 Jun 2026)
- Lokasi: **Admin → Konten Halaman → tab "Pengaturan Website" → Favicon Website** (reuse CMS existing, tidak ada CMS/collection baru).
- Penyimpanan: `site_content` key **`site.favicon`** berisi JSON `{url, version}` (version = timestamp save untuk cache-busting stabil, tidak berubah per render). Binary tetap di Media Storage Fase 20; tulis butuh `content:write`, publik hanya membaca.
- UI: preview favicon aktif, **Upload dari Perangkat** + **Pilih dari Media Library** (tanpa input URL), **crop persegi otomatis** via UniversalImageCropper (spec `aspect: 1`, rekomendasi 1:1 · 512×512), preview realistis (mock tab browser + 16/32/48px + 180px iOS), **Simpan Favicon**, **Reset ke Favicon Default**.
- Frontend: komponen `SiteIcons` (di `App.js`) membaca konfigurasi lalu mengganti seluruh `<link rel="icon">` (16/32/48/192/512), `shortcut icon`, dan `apple-touch-icon` (180) dengan `?v=<version>`; fallback `/favicon.svg` bila belum dikonfigurasi atau setelah Reset. `lib/siteIcons.js` berisi parse/apply/href + default.
- Fix kecil: `MediaPicker` membersihkan `localPreview` saat value dikosongkan (preview ikut hilang setelah Reset).
- Verifikasi: upload 600×400 → cropper frame ratio 1.00 → crop 333×333 → Save → 7 link ikon aktif; favicon custom tampil di `/`, `/club`, `/teams`, `/matches`, `/news`, `/gallery`, `/merchandise`, `/contact`, `/login`, `/admin/login` (juga setelah refresh); pilih dari Media Library → crop persegi → Save → favicon berganti; **Reset** → semua link kembali `favicon.svg`. Overflow 0, console 0 error, `yarn build` sukses tanpa warning.
- Data: 3 media uji dihapus (media 41 → 38, hanya berkas milik user), `site.favicon` tidak tertinggal (site_content hanya `member.card.background_url` & `site.background` milik user). Tanpa deployment.

## FASE — Match Input, Match Card Polish & Countdown (26 Jun 2026)
- **Transparansi logo (bug fix)**: penyebabnya dua tempat. (1) `ImageCropper` selalu mengekspor JPEG saat sumber berupa URL (Media Library / re-crop) → alpha hilang & area transparan jadi hitam. Kini format ditentukan dari sumber: PNG/WEBP → ekspor PNG (alpha terjaga). (2) `media_service._sanitise` mengonversi WEBP/gambar ber-alpha ke JPEG (RGB) → sekarang mendeteksi `RGBA/LA/PA/transparency` dan menyimpan sebagai PNG. Frame cropper juga memakai checkerboard (bukan hitam) sebagai indikator transparansi. CATATAN: logo lawan yang SUDAH tersimpan sebagai JPEG hasil crop lama tetap punya latar hitam — perlu di-crop/upload ulang sekali oleh admin.
- **Tanggal + jam**: field `time` (sudah ada di model) kini muncul di form Admin sebagai input `type="time"` ("Waktu Pertandingan (WIB)", label & help WIB). `ResourceManager` mendukung `type: 'time'`.
- **Countdown**: `kickoffAt()` membuat timestamp `YYYY-MM-DDTHH:mm:00+07:00` (WIB, bukan timezone browser), countdown realtime per detik, berhenti pada 0 (tidak pernah negatif), fallback status LIVE/FINISHED/POSTPONED. Match tanpa jam → 00:00 (backward compatible).
- **Match Card redesign** (`MatchCardShell`): header gambar `match_cover` (frame tetap h-36/h-44 mobile 144px, `object-fit: cover`, tidak mengubah tinggi kartu) — sebelumnya `match_cover` tidak pernah dirender di kartu; nama kompetisi di atas, dua sisi simetris dengan **kotak logo tetap 64/72px** (logo `object-contain` 52/60px) sehingga kedua tim seimbang, badge VS/skor di tengah, countdown 4 unit, lalu tanggal • jam WIB • stadion, hierarki tipografi jelas.
- **Pattern gradasi**: dua radial gradient halus (navy 7% kiri-atas + gold 14% kanan-atas) + garis gold 3px di sisi kiri, `pointer-events-none`, tidak menutupi logo/teks.
- Verifikasi: 1920/1280/768/390 → cover 176/176/176/144px `cover`, tinggi kartu stabil, lebar kedua crest identik (60/60, 52/52 di mobile), countdown berjalan realtime (04 HARI 13 JAM …), **overflow 0 px**, console 0 error, `yarn build` sukses tanpa warning. Data produksi tidak diubah (matches 1, media 38, banners 2) dan tidak ada data dummy.

## FASE — Final Polish Match Card: Feed 4:5, Story 9:16, Overlay CMS & Logo Contain (26 Jun 2026)
- **Rasio**: kartu sosial kini **Feed 4:5 (1080×1350)** + **Story 9:16 (1080×1920)** (1:1 dihapus). Satu renderer (`MatchScoreCardGenerator`) untuk preview Admin maupun output unduhan — tidak ada renderer kedua.
- **Struktur visual**: foto `match_cover` sebagai background (`cover`) → overlay navy + gold glow ALSABBAT → pattern garis halus → scrim gelap hanya di area teks → informasi match. Identitas warna kartu tetap terasa; kotak info memakai fill navy `rgba(1,40,145,0.45)` + border gold.
- **Overlay CMS**: `site_content` key **`match.card.overlay_transparency`** (0–100, default **35**). Panel baru **Admin → Matches → "Desain Kartu Pertandingan"** (`components/admin/MatchCardDesign.js`) dengan slider "Transparansi Overlay" (0% = warna kartu paling kuat, 100% = foto paling terlihat), **preview Feed & Story realtime tanpa Save**, tombol **Simpan Desain** & **Reset ke Desain Default**. Sumber tunggal: `lib/matchCardDesign.js` (`useMatchCardDesign`).
- **Matchup compact**: logo kedua tim didekatkan ke titik tengah (offset = ½ lebar VS/skor + gutter 0.03W), ukuran tetap kecil (0.12W feed / 0.13W story), grup diturunkan menempel kotak informasi (`crestY = blockY − 0.10W − ½ crest`), nama tim di bawah masing-masing logo (truncate 0.26W, tidak bertabrakan).
- **Logo = contain, foto = cover**: `drawCrest` menggambar logo `contain` dengan safe padding di dalam container tetap (tanpa `clip`, tidak pernah terpotong). `ImageCropper` mendapat mode **"Muat penuh (logo)"** vs **"Isi frame (foto)"**; spec logo di `mediaHints` (`clubLogo`, `teamLogo`, `competitionLogo`, `opponentLogo`, `sponsorLogo`) kini `fit: 'contain'` → default muat penuh, output selalu PNG dengan latar transparan (alpha channel utuh). `media_service.sanitize_upload` tetap menyimpan PNG ber-alpha tanpa resize/crop.
- **Tambahan**: tanggal kartu diformat "31 AGUSTUS 2026 · 15:30 WIB"; tombol "Kartu Sosial" per baris di Admin → Matches (dialog preview Feed/Story dengan renderer yang sama).
- Verifikasi (tanpa Testing Agent): upload PNG transparan 1200×700 & 700×1200 → tersimpan RGBA, dimensi utuh, penanda bawah tetap ada; crop contain 700×1200 → output 1200×1200, sudut alpha 0, atas & bawah logo utuh; slider realtime (35%→75%→0% mengubah pixel canvas tanpa Save); Save 60% → pixel kartu publik **identik** dengan preview Admin; Reset → 35%; overflow **0 px** di 1920/1440/1280/1024/768/390; console **0 error**; `yarn build` sukses tanpa warning; media uji dihapus, `clubs.logo` & data produksi tidak berubah, tanpa deployment.

## FASE — Galeri Foto Pemain & Staf (maks 3 foto) — 26 Jun 2026
- **Data model (additive)**: `gallery_images: List[str]` (maks 3) pada `PlayerBase` & `StaffBase` — referensi URL Media Library, tanpa collection baru, tanpa binary di Mongo. Validator `normalise_gallery` membuang kosong/duplikat/>800 char dan memotong ke 3. `make_update_model` kini menerima parameter `validators` sehingga PATCH ikut tervalidasi (sebelumnya validator base hilang di PATCH). Permission tetap `player:write` / `staff:write`.
- **Admin**: field baru `type: 'gallery'` di `ResourceManager` + komponen `components/admin/MediaGalleryField.js`. Setiap slot memakai `MediaPicker` existing (Upload dari Perangkat / Pilih dari Media Library / Sesuaikan-Crop / Hapus), label "Galeri Foto — n/3", tombol ← → untuk urutan (array = satu-satunya sumber sorting), slot "Tambah Foto" hilang saat 3/3 dengan keterangan "Maksimal 3 foto.". Spec baru `MEDIA_SPECS.playerGallery` & `staffGallery` (4:5 · 1200×1500).
- **Publik (satu renderer)**: `components/public/PersonPhotoGallery.js` dipakai halaman detail pemain & staf. 1 foto → tanpa arrow/dot; 2–3 foto → crossfade 340ms (opacity+scale), arrow, dot indicator, swipe touch (via ref, bukan state), keyboard ArrowLeft/Right saat fokus, lightbox (klik foto; Escape/tombol tutup; arrow di lightbox). Foto non-aktif `pointer-events: none` agar klik tidak tertahan.
- **Halaman baru**: `/staff/:staffId` (`pages/public/StaffDetailPage.js`) + kartu staf di halaman PEMAIN kini menjadi link ke detail staf.
- **Backward compatible**: helper `lib/personPhotos.js` → pakai `gallery_images` bila ada, jika kosong pakai `photo` lama. `gallery_images[0]` = foto utama (termasuk untuk OG image).
- Verifikasi (tanpa Testing Agent): PATCH 4 foto → tersimpan 3; duplikat/kosong dibersihkan; create staf dengan 4 foto → 3; admin 3/3 tanpa slot tambah; reorder (← →) + hapus + Simpan → urutan persist setelah reload; slider publik pemain (3 foto: arrow, dot, keyboard, lightbox + Escape/tutup) & staf (swipe kiri/kanan berpindah benar); pemain hanya `photo` → 1 foto tanpa arrow/dot; overflow **0 px** di 1920/1440/1280/1024/768/390; console **0 error**; `yarn build` sukses tanpa warning.
- Cleanup: gallery pemain uji dikembalikan ke `[]`, staf uji dihapus (staff total 0 seperti semula), `photo` pemain nyata utuh, tidak ada data/foto dummy tertinggal, tanpa deployment.

## FASE — Compact Floating Glass Next Match Card (26 Jun 2026)
- Hanya `components/public/home/HeroNextMatchPanel.js` diubah (frontend, tanpa backend/DB/CMS/logic countdown).
- Panel hero "Pertandingan Berikutnya" dibuat compact: desktop **430×213 → 320×128 px** (≈-26% lebar, -40% tinggi), mobile 390 dibatasi `max-w-[300px]` (sebelumnya melebar 407 px sampai terpotong frame).
- Layout baru 3 baris rapat: (1) label + countdown inline (4 unit kecil), (2) crest 26 px + nama tim + VS satu baris, (3) tanggal·jam·stadion (truncate) + CTA "Pusat Pertandingan" compact (min-h 30 px).
- Gaya: glass `rgba(1,12,40,0.56)` + `blur(10px)` + border gold `rgba(252,207,43,0.22)` + soft shadow (bukan kotak hitam solid) → foto banner tetap focal point.
- Verifikasi: 1440 → 320×128, 390 → 300×128 (tepi kanan 340 px, di dalam frame), overflow 0 px pada keduanya, countdown tetap berjalan (detik menurun, logic existing), CTA menuju `/matches/:id`, console 0 error, build sukses tanpa warning, DB & data tidak disentuh.
