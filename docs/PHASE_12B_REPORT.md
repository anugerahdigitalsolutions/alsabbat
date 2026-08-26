# FASE 12B — EXACT UI VISUAL CORRECTION & HOMEPAGE REFINEMENT (Laporan)

Tanggal: 26 Juni 2026 · Frontend-only · Testing Agent **tidak dijalankan** · **tanpa deployment**
Brand: `#FCCF2B` `#012891` `#000000` `#FEFEFE` · Poppins only · ALSABBAT = 1 club · 1 team · 1 squad

---

## 1. Perubahan visual (agar mendekati referensi)

| Area | Sebelum (12) | Sekarang (12B) |
| --- | --- | --- |
| Page frame | Halaman full-bleed | **Outer soft-white** + **frame putih rounded 30px** dengan shadow besar, max-width 1400px, alignment header/hero/konten konsisten (`als-shell-bg`, `als-frame`, `als-frame-inner`) |
| Header | Tinggi 74px, 10 menu, tanpa search, Staff Access hanya di footer | **Compact 72px**, logo kiri, **nav tengah 8 menu** (Home, Club, Squad, Matches, News, Gallery, Merchandise, Contact) dengan **underline gold** aktif, **ikon Search**, **pill gold "Staff Access"** di kanan (subtle, bukan menu Admin Panel — tautan admin panel tetap tidak ada) |
| Search | Tidak ada | **Search dialog nyata** (bukan hiasan): query ke `/content/posts`, `/players`, `/matches` memakai parameter `search` yang sudah didukung backend, hasil terkelompok + navigasi |
| Hero | Hitam polos, full-bleed, tinggi 640/760, stats strip | **Navy cinematic** `#012891` bergradasi ke gambar, **rounded 26px** di dalam frame, tinggi 520/580/640, headline 3 baris **"ONE CLUB. / ONE PASSION. / ONE ALSABBAT."** (baris ke-3 gold), subtitle, **CTA gold + CTA outline**, baris **Follow Us** (hanya sosial yang benar-benar terisi) |
| Next Match | Panel di kolom grid | **Floating glass panel** di dalam hero: **crest ALSABBAT + VS + crest lawan**, nama kedua klub, **countdown live Days/Hrs/Mins/Secs**, tanggal · jam WIB · venue, CTA Match Center. Responsif (stacked di mobile, tidak lagi tumpang tindih) |
| Pillar strip | Kartu ikon di atas | **4 kartu putih** ikon **kotak gold** + judul navy + copy bahasa referensi (One Club / One Team / One Dream / One Glory) |
| Matchday + News | Section terpisah dengan grid seragam | **Dua kolom**: kiri kartu **Upcoming Match** (competition, crest–VS–crest, tanggal/jam/venue, **Match Details**), kanan **Latest News** (1 featured besar + 3 item kecil bertumpuk, View All News) |
| Spotlight row | Squad grid besar | **Tiga kolom**: Player Spotlight (komponen existing) · **Team Stats 2×2** (Matches Played / Wins / Draws / Losses) · **Official Store** (hanya jika ada produk) |
| Gallery | Tile besar + 4 thumbnail | **Strip horizontal 5 tile** rounded, gap kecil konsisten, hover zoom, View All Gallery |
| Sponsors | Section gelap | Strip putih bersih, hanya tampil jika ada sponsor nyata |
| CTA band | Sudah ada | Dipertahankan (navy + crest + CTA gold), tombol tidak lagi turun baris di desktop |
| Footer | Hitam | **Putih premium**: logo + deskripsi, **Quick Links 2 kolom**, **Contact Us**, **Follow Us**, bottom bar copyright + **Staff Access paling bawah (subtle)** |
| Section yang dihapus dari home | About, Achievements, Social band | Dihapus agar tidak “terlalu banyak section identik”; halaman `/club`, `/achievements`, `/sponsors` tetap ada |

Crest lawan baru: `OpponentCrest` — memakai logo asli bila tersedia, jika tidak memakai shield inisial brand-safe (bukan gambar palsu).

## 2. File yang berubah

**Baru**: `components/public/SearchDialog.js`, `components/public/home/{UpcomingMatchCard,TeamStatsBlock,StorePromoCard,GalleryStrip,OpponentCrest}.js`.
**Rewrite**: `pages/public/HomePage.js`, `components/public/PublicHeader.js`, `components/public/PublicLayout.js`,
`components/public/home/{PillarStrip,HeroNextMatchPanel}.js`.
**Diubah**: `index.css` (frame, `als-sq-icon`, `als-row-label`, `als-view-all`, tinggi hero),
`components/public/CinematicHero.js` (navy overlay, rounded, headline gold multi-baris, Follow Us, panel floating),
`components/public/PublicFooter.js` (tema terang + Quick Links/Contact/Follow Us), `components/public/home/JourneyCta.js`.
**Backend/database**: **tidak ada perubahan** (tanpa model/endpoint/index baru, tanpa dependency baru).

## 3. Aturan data (dipatuhi penuh)

- Tidak ada satupun data dummy permanen: **tidak ada** pemain/pertandingan/lawan/berita/sponsor/klasemen/statistik/gallery palsu di database produksi.
- **League table / klasemen**: model datanya belum ada di backend → **section tidak dibuat** (bukan dummy Persikam/Tiger United/Garuda Muda).
- **Ticket card**: ticketing belum ada → tidak ada tombol beli tiket palsu. Diganti kartu **Official Store** yang hanya muncul bila katalog merchandise benar-benar berisi produk.
- **Newsletter footer**: fitur belum ada → tidak ditampilkan (diganti Follow Us dari data sosial nyata).
- Team Stats & hero slide seluruhnya dihitung dari data nyata; kosong → `—` atau empty state premium.
- Pratinjau visual dijalankan pada **database sekali-pakai** `alsabbat_ui_demo`, lalu **di-drop**.

## 4. Verifikasi

| # | Uji | Hasil |
| --- | --- | --- |
| 1 | `yarn build` | ✅ Compiled successfully, **0 warning** — 246.3 kB gz JS (+1.02 kB), 14.17 kB gz CSS |
| 2 | `GET /api/health` | ✅ ok / database connected |
| 3 | Homepage 1920 / 1440 / 390 | ✅ sesuai referensi, **overflow 0 px** di semua viewport |
| 4 | `/matches`, `/news`, `/gallery`, `/teams`, `/merchandise`, `/cart`, `/checkout`, `/order`, `/club`, `/contact`, `/achievements`, match detail, player detail | ✅ render, overflow 0 px, judul SEO benar |
| 5 | Admin login | ✅ render normal (admin tetap di luar navigasi publik) |
| 6 | Hero slider | ✅ 4 slide, autoplay 6s, crossfade 800ms, prev/next, dots, counter `01 / 04`, pause/play, keyboard, swipe, reduced-motion |
| 7 | Search dialog | ✅ 11 hasil nyata (berita/pemain/pertandingan) pada data uji, empty state jujur |
| 8 | Countdown | ✅ live, tidak rusak/overlap di 390px (stacked) maupun desktop |
| 9 | Brand scan | ✅ **0** `#222222` / `#222` / `#1A1A1A` / `rgba(34,34,34)` |
| 10 | `transition: all` | ✅ 0 |
| 11 | Wording multi-team | ✅ 0 (`youth`, `reserve team`, `second team`, `first team`) |
| 12 | Empty-state produksi (DB bersih) | ✅ hero brand navy elegan, pillars, empty state premium, Team Stats `—` |
| 13 | Cleanup data | ✅ `alsabbat_ui_demo` di-drop; produksi: teams 1, clubs 1, users 1, **sisanya 0**, `demo:true` = **0** |

## 5. Screenshot verification

Desktop 1440/1920: hero navy + headline gold + floating Next Match panel; pillar strip; Upcoming Match + Latest News;
Player Spotlight + Team Stats + Official Store; gallery strip; sponsors; CTA band; footer terang dengan Staff Access
paling bawah; search dialog. Mobile 390: hero stacked (headline, CTA, Follow Us, panel countdown rapi), pillar
bertumpuk, Upcoming Match. Kondisi database bersih juga di-screenshot (empty state premium).

## 6. Known limitations

1. Klasemen liga & ticketing belum dibuat (belum ada model/fitur; menghindari data & tombol palsu).
2. Elemen referensi "Pride of Our City" (deretan foto pemain kecil di hero) belum dibuat karena butuh kurasi foto skuad nyata.
3. Logo lawan & logo sponsor memakai fallback inisial/teks sampai file asli diunggah.
4. Tampilan final akan mengikuti kualitas foto/konten nyata yang diunggah nanti.

---

**STOP GATE 12B** — tanpa deployment, tanpa perubahan Railway/Vercel/MongoDB/domain/DNS/SSL, tanpa kredensial produksi.
