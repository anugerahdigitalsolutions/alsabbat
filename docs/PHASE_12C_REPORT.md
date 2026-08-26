# FASE 12C — FULL WEBSITE VISUAL CONSISTENCY (Laporan)

Tanggal: 26 Juni 2026 · Frontend-only · Testing Agent **tidak dijalankan** · **tanpa deployment**
Master design language: Homepage Fase 12B (tidak diubah/dirusak).

---

## 1. Strategi: ubah komponen bersama, bukan menulis ulang tiap halaman

| Perubahan shared | Dampak |
| --- | --- |
| `.als-container` diselaraskan dengan frame homepage (`max-width 1400px`, padding `px-4 / sm:px-7 / xl:px-9`) | **Semua** halaman inner langsung sejajar dengan Homepage — tidak ada lagi lebar konten berbeda |
| `PublicPageHeader` → **navy cinematic** `#012891`, gradasi diagonal, rounded 26px di dalam frame, padding & judul lebih besar (`sm:text-5xl / lg:3.4rem`), gold rule + breadcrumb | Header inner **13 halaman** (Matches, News, Squad, Gallery, Merchandise, Club, Contact, Achievements, Sponsors, Album, Player, Match, Order) langsung premium & seragam |
| `PublicHeader` / `PublicFooter` / `PublicLayout` (frame) dari 12B | Header & footer identik di seluruh halaman; Staff Access tetap subtle di kanan header (pill gold, bukan Admin Panel) **dan** di baris paling bawah footer |
| `SquadShowcase` diberi prop `limit` | Kartu pemain premium dipakai ulang di halaman Squad tanpa komponen kedua |
| `NotFoundPage` | 404 jadi panel navy rounded + `als-display-xl` + CTA gold/ghost (bukan 404 polos) |
| Judul editorial (referensi) | Matches "Every Match. Every Moment." · News "Stories From ALSABBAT" · Squad "One Squad. One Family." · Gallery "Moments We Remember" · Merchandise "Wear The Badge" · Contact "Connect With ALSABBAT" · Club "This Is ALSABBAT" |
| `TeamsPage` **ditulis ulang sebagai Squad page** | Menghapus pola multi-team terakhir (grid/daftar team + tautan team detail) → Player Spotlight + grid pemain per posisi + tim pendukung. Sekaligus memperbaiki bug: halaman menampilkan "Skuad belum tersedia" walaupun pemain ada, karena sebelumnya bergantung pada daftar **team** |

Tidak ada komponen UI kedua yang dibuat; halaman yang sudah sesuai (Match Detail, News Detail, Album Detail, Cart, Checkout, Order, Merchandise) **tidak ditulis ulang** — ikut berubah lewat shared components & token.

## 2. Shared components yang dipakai (reuse)

PublicLayout/frame · PublicHeader · PublicFooter · SearchDialog · PublicPageHeader · SectionShell · CinematicHero ·
MatchdayCountdown · PlayerSpotlight (`pickSpotlightPlayer`) · MatchCardShell · MatchScoreboard · MatchTimeline ·
FormationPitch · MatchStatistics · HeadToHeadPanel · MatchScoreCardGenerator · ShareMatchday · NewsCardShell ·
AlbumCard · MediaLightbox · SquadShowcase · GalleryStrip · UpcomingMatchCard · TeamStatsBlock · EmptyState/LoadingState/
ErrorState · Reveal/useScrollReveal/usePrefersReducedMotion · usePageSeo · shadcn/ui · design tokens `als-*`.

## 3. File yang diubah

`index.css` (`.als-container`), `components/public/PublicPageHeader.js`, `components/public/home/SquadShowcase.js`,
`pages/public/TeamsPage.js` (rewrite → Squad), `pages/public/NotFoundPage.js`,
serta judul/eyebrow pada `MatchesPage.js`, `NewsPage.js`, `GalleryPage.js`, `MerchandisePage.js`, `ContactPage.js`, `ClubPage.js`.
**Backend: 0 perubahan. API: 0 endpoint baru. Database: 0 perubahan. Dependency: 0 tambahan.**

## 4. Verifikasi

| Uji | Hasil |
| --- | --- |
| `yarn build` | ✅ Compiled successfully, **0 warning** — 246.87 kB gz JS (+575 B), 14.2 kB gz CSS |
| `GET /api/health` | ✅ ok / database connected |
| Render + overflow desktop 1440 | ✅ `/matches`, `/news`, `/teams`, `/gallery`, `/merchandise`, `/club`, `/contact`, `/404` → **ov=0** |
| Render + overflow desktop 1280 | ✅ `/news` → ov=0 |
| Render + overflow detail pages | ✅ player detail, match detail, news detail, album detail, cart → ov=0 |
| Render + overflow mobile 390 | ✅ `/`, `/matches`, `/teams`, `/news`, `/gallery`, `/merchandise`, `/club`, `/contact`, 404, `/admin/login` → **ov=0** |
| Squad page (data uji) | ✅ Player Spotlight + grup posisi (Penjaga Gawang/Belakang/Tengah/Depan) + jumlah pemain |
| Empty state produksi | ✅ premium (contoh `/news`: "Stories From ALSABBAT" + empty card, `/matches`: "Belum ada jadwal pertandingan") |
| Brand scan `#222222` / `#1A1A1A` / `rgba(34,34,34` | ✅ **0** |
| `transition: all` | ✅ **0** |
| Wording multi-team (`youth`, `reserve team`, `second team`, `first team`) | ✅ **0** |
| Staff Access | ✅ pill subtle di header kanan + baris paling bawah footer; **tidak ada** tautan Admin Panel di navigasi publik |
| SEO | ✅ title/canonical/robots per halaman tetap (Squad, Matches, News, … ; `noindex` cart/checkout/order/404) |
| Data | ✅ pratinjau memakai database sekali-pakai `alsabbat_ui_demo` → **di-drop**; produksi: teams 1, clubs 1, users 1, **sisanya 0**, `demo:true` = **0** |

## 5. Screenshot

Desktop 1440: `/matches` (header navy rounded + kartu match), `/teams` (spotlight + grid pemain per posisi), 404 navy.
Desktop 1280: `/news` empty state premium. Mobile 390: `/matches` (header stacked, tab, empty state) + seluruh route ov=0.

## 6. Catatan / limitasi

1. Klasemen liga & ticketing tetap **tidak dibuat** (belum ada model/fitur → menghindari data palsu).
2. Player Spotlight menyisakan area gelap di layar sangat lebar bila foto pemain berorientasi portrait — mengikuti rasio foto asli.
3. Tampilan final tetap bergantung pada kualitas foto/konten nyata yang akan diunggah.

---

**STOP GATE 12C** — tanpa deployment, tanpa perubahan Railway/Vercel/MongoDB/domain/DNS/SSL, tanpa kredensial produksi.
