# FASE 12 — UI/UX REDESIGN & VISUAL SHOWCASE (Laporan)

Tanggal: 26 Juni 2026 · Sifat: **redesign frontend saja** — backend/database architecture tidak diubah
Testing Agent: **TIDAK dijalankan** · Deployment: **TIDAK dilakukan** (STOP GATE 12)
ALSABBAT tetap **1 club · 1 team · 1 squad** · Brand `#FCCF2B` `#012891` `#000000` `#FEFEFE`, Poppins only

---

## A. Perubahan UI

**Homepage (redesign total, mengikuti komposisi referensi — bukan identitas/tema referensi):**
1. **Hero cinematic sebagai focal point** — tinggi 640px (mobile) / 760px (desktop), overlay hitam→biru
   diagonal, ken-burns, headline `clamp(2.25rem→4.6rem)`, tagline brand, CTA pill gold + ghost.
   Autoplay 6s, crossfade 800ms, prev/next, dots, counter `01 / 04`, pause on hover/focus, keyboard
   ←/→, swipe mobile, `prefers-reduced-motion` (tanpa autoplay & tanpa ken-burns) — semua **dipertahankan** dari Fase 5A.
2. **Panel Next Match kaca (baru)** di dalam hero: lawan, countdown live 4 unit, tanggal/jam/venue, CTA Match Center.
3. **Quick club stats strip** premium (5 kolom): Skuad Utama, Pemain, Pertandingan, Kemenangan, Prestasi.
   Angka **hanya dari data nyata**; tanpa data → `—` (bukan 0 palsu). "Kemenangan" dihitung dari hasil pertandingan FINISHED.
4. **Pillar strip** One Club / One Team / One Dream / One Glory — copy identitas brand (bukan statistik).
5. **About ALSABBAT** — layout teks + gambar besar (dari album/berita/foto pemain yang ada), 3 kartu info klub, CTA.
6. **Matchday** — countdown card + kartu hasil terakhir (duplikasi kartu next match dihapus).
7. **Newsroom** — 1 featured besar + 3 kartu ringkas dengan thumbnail (sebelumnya grid 3 kartu seragam).
8. **Squad** — Player Spotlight + grid kartu premium (foto besar, nomor punggung pill gold, posisi, hover zoom + CTA reveal).
9. **Match Moments** — 1 tile besar + 4 thumbnail, hover zoom, jumlah foto/video (disembunyikan bila 0).
10. **Honours** — timeline horizontal dengan node lingkaran + hairline gold.
11. **Social** section dipertahankan (platform independen, tanpa klaim auto-post).
12. **CTA band "Follow The Journey"** biru + glow gold sebelum footer (Match / Squad / Gallery).
13. **Header** — lebih tinggi (74px), crest lebih besar, wordmark tebal, nav publik lengkap, label `Tim` → **`Squad`**.
    **Admin tidak ada di header.**
14. **Footer** — navigasi 2 kolom (10 tautan), kontak, sosial, copyright, **Staff Access tetap subtle di baris paling bawah**.

**Design tokens & utilities baru** (`index.css`): `als-btn-gold` / `als-btn-ghost` / `als-btn-blue` (pill),
`als-glass`, `als-hero-frame`, `als-eyebrow`, `als-display-xl`, `als-tile` (hover zoom), `als-scrim-bottom`,
`als-hairline`. Spacing section dinaikkan (`py-14 sm:py-20`), judul section `text-4xl` di desktop.

**Inner pages** — konsisten otomatis lewat komponen bersama yang di-upgrade (`PublicPageHeader`,
`SectionShell`, `PublicHeader`, `PublicFooter`, tokens): `/matches`, `/matches/:id`, `/news`, `/news/:slug`,
`/gallery`, `/gallery/:id`, `/teams`, `/players/:id`, `/merchandise`, `/cart`, `/checkout`, `/order`,
`/achievements`, `/club`, `/contact`. Tab Match Center dibuat wrap agar tidak overflow di mobile.

## B. Component yang di-REUSE (tanpa arsitektur kedua)

CinematicHero · MatchdayCountdown (`kickoffAt`) · PlayerSpotlight (`pickSpotlightPlayer`) · Match Center
(FormationPitch, MatchStatistics, MatchTimeline, MatchGallerySection, HeadToHeadPanel, MatchScoreCardGenerator,
ShareMatchday) · Gallery/AlbumCard/MediaLightbox/`resolveMediaUrl` · News CMS · Merchandise/Cart/Checkout/Order ·
Social Publishing · SEO (`usePageSeo`, `applyPageSeo`) · Reveal/`useScrollReveal`/`usePrefersReducedMotion` ·
SectionShell · SponsorsStrip · EmptyState/LoadingState/ErrorState · ClubCrestMark · shadcn/ui.

## C. File yang berubah

**Baru**: `components/public/home/{PillarStrip,HeroNextMatchPanel,NewsShowcase,GalleryShowcase,SquadShowcase,AchievementsTimeline,JourneyCta}.js`,
`hooks/useCountdown.js`, `scripts/phase12_demo_seed.py`.
**Diubah**: `index.css`, `pages/public/HomePage.js` (rewrite), `components/public/CinematicHero.js`,
`PublicHeader.js`, `PublicFooter.js`, `SectionShell.js`, `pages/public/{TeamsPage,MatchDetailPage}.js`,
+ 24 file yang menerima brand fix `#1A1A1A`/`rgba(34,34,34)` → `#000000`/`rgba(0,0,0)`
(termasuk `App.css`, `MatchCardShell`, `NewsCardShell`, `AlbumCard`, `MediaLightbox`, `EmptyState`,
`ResourceManager`, `AdminShell`, dan beberapa halaman publik/admin).
**Backend/database**: tidak ada perubahan model, endpoint, atau index.

## D. Demo content yang dibuat (khusus pratinjau)

Untuk melihat website secara penuh, demo content dijalankan pada **database sekali-pakai**
(`MONGODB_DB_NAME=alsabbat_ui_demo`) — bukan di database produksi:
1 musim + 1 kompetisi, 8 pemain (foto stok), 3 pertandingan (1 upcoming + 2 selesai),
8 lineup + 4 match event, 4 berita (termasuk 1 MATCH_REPORT), 5 album + 5 media, 3 prestasi, 5 sponsor,
serta deskripsi/kontak/sosial klub. Skrip `scripts/phase12_demo_seed.py` **menolak berjalan** kecuali nama
database mengandung `verify`/`check`/`demo`. Gambar memakai stok publik (Unsplash/Pexels), tanpa data pribadi.

## E. Demo content yang dihapus

Database sementara `alsabbat_ui_demo` **di-drop sepenuhnya** dan `MONGODB_DB_NAME` dikembalikan ke
`alsabbat_platform`. Audit setelah cleanup:

| Koleksi | Jumlah |
| --- | --- |
| teams | **1** (ALSABBAT) |
| clubs / users | 1 / 1 (admin) |
| players, matches, posts, media, gallery_albums, achievements, sponsors, orders, products, social_publications, match_events, match_lineups, seasons, competitions | **0** |
| dokumen bertanda `demo: true` | **0** |
| daftar database | `admin`, `alsabbat_platform`, `config`, `local` (tidak ada database demo) |

Tidak ada data nyata yang dihapus (tidak ada data nyata yang pernah dimasukkan selain klub/tim/admin).

## F. Verification

| Uji | Hasil |
| --- | --- |
| `yarn build` | ✅ Compiled successfully, **0 warning** — 245.27 kB gz JS (+3.06 kB), 13.67 kB gz CSS |
| `GET /api/health` | ✅ ok / database connected (setelah restore) |
| Homepage (desktop 1920) | ✅ hero, panel next match, stats, pillars, about, matchday, news, squad, gallery, honours, sponsors, social, CTA, footer |
| Homepage (mobile 390) | ✅ semua section menumpuk rapi |
| Inner pages | ✅ 16 route render tanpa error: matches, match detail, news, news detail, gallery, album, teams, player, merchandise, cart, checkout, order, achievements, club, contact, admin login |
| Horizontal overflow | ✅ **0 px** di 1920 / 1440 / 390 (satu temuan 21 px di Match Detail mobile → diperbaiki via TabsList wrap) |
| Hero slider | ✅ 4 slide, autoplay, dots, counter, prev/next, pause, keyboard, swipe, reduced-motion |
| Admin tersembunyi | ✅ tidak ada tautan admin di header publik |
| Staff Access | ✅ hanya di baris paling bawah footer, gaya subtle |
| SEO | ✅ title/canonical/robots per halaman tetap bekerja (`Squad | ALSABBAT Football Club`, `noindex` cart/checkout/order/404) |
| Brand scan | ✅ **0** kemunculan `#222222` / `#222` / `#1A1A1A` / `rgba(34,34,34)` di seluruh JS/CSS |
| Font | ✅ hanya Poppins (tidak ada `font-family` lain) |
| Single-team | ✅ 0 wording `youth` / `reserve team` / `second team` / `first team` / multi-team; tidak ada team selector |
| `transition: all` | ✅ 0 kemunculan |
| Data integrity | ✅ database produksi bersih, database demo di-drop |

## G. Screenshot verification

Diambil pada database demo (bukan produksi): hero desktop 1920 + panel next match, stats strip + pillar
strip (overlap awal diperbaiki), About, Matchday, Newsroom (featured + list), Squad (spotlight + grid),
Match Moments, Honours timeline, Sponsors, CTA band + footer, hero mobile 390 + stats/pillars mobile,
Match Detail (H2H, Match Report, Score Card, Share) desktop & mobile, News list mobile.

## H. Build result

`yarn build` sukses tanpa warning; prebuild `robots.txt` tetap ter-generate dari environment.
Bundle 245.27 kB gz (+3.06 kB) — tanpa dependency baru (tanpa library carousel/animasi tambahan).

## I. Responsive result

| Viewport | Hasil |
| --- | --- |
| 1920×1080 | ✅ hero penuh, grid 4–5 kolom, tidak ada overflow |
| 1440×900 | ✅ layout proporsional |
| 390×844 (mobile) | ✅ hero + panel menumpuk, kartu 1–2 kolom, target sentuh ≥44px, overflow 0 |

Tidak ditemukan teks terpotong, gambar distorsi (semua `object-cover`), atau kartu overflow.

## J. Accessibility result

`alt` pada semua gambar; `aria-hidden` pada ikon/dekorasi; `aria-label` pada kontrol hero, sosial, dan canvas;
`role="region"`/`aria-roledescription="carousel"` + `role="tablist"`/`aria-selected` pada hero; `aria-live` pada
countdown; `<dl>/<dt>/<dd>` untuk data klub; fokus ring via `als-focus`; tinggi minimum 44–46px pada semua
tombol/pill; animasi hanya `opacity` + `transform`; `prefers-reduced-motion` dihormati; tanpa `transition: all`;
tanpa video background autoplay.

## K. Brand audit

`#FCCF2B` (CTA/aksen), `#012891` (nav aktif, CTA sekunder, band CTA), `#000000` (teks, section gelap,
overlay, footer), `#FEFEFE` (surface/teks on-dark). **0** `#222222`/`#1A1A1A`; token `--border-soft`,
`--border-strong`, `--muted-fg`, `.als-scrim` kini berbasis `rgba(0,0,0,…)`. Font: Poppins tunggal.

## L. Single-team audit

Nav publik memakai label **Squad**; halaman `/teams` ber-judul SEO "Squad"; homepage memakai satu grid skuad
tanpa selector; copy pillar "One Team · Satu tim. Satu skuad."; tidak ada wording youth/reserve/second team;
arsitektur multi-team **tidak dihidupkan kembali**.

## M. Known limitations

1. Tampilan diverifikasi dengan **demo content** karena database produksi sengaja bersih; setelah konten nyata
   diisi, komposisi akan mengikuti data tersebut (empty state profesional bila kosong).
2. Logo lawan belum ada di data (kartu memakai inisial/tanpa crest lawan) — akan otomatis muncul bila diisi.
3. Standings/tabel liga pada referensi **tidak dibuat** karena belum ada model datanya (akan jadi fitur terpisah bila diminta).
4. Newsletter/ticketing pada referensi tidak dibuat (di luar cakupan Fase 12, dan tidak boleh data palsu).
5. Code splitting halaman admin tetap ditunda (P2).

---

**STOP GATE 12** — tidak ada deployment, tidak ada konfigurasi Railway/Vercel/Atlas/domain/DNS/SSL/CDN,
tidak ada kredensial produksi (Midtrans/Instagram/TikTok/YouTube) yang diaktifkan atau diubah.
Fase deployment menunggu persetujuan UI final dari user.
