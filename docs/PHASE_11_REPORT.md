# FASE 11 — FINAL FEATURE COMPLETION & EXPERIENCE POLISH (Laporan)

Tanggal: 26 Juni 2026 · Sifat: **additive**, tidak merombak Fase 1–10
Testing Agent: **TIDAK dijalankan** (permintaan user) · Data dummy permanen: **tidak ada**
ALSABBAT tetap **1 club · 1 team · 1 squad** · Brand `#FCCF2B` `#012891` `#000000` `#FEFEFE`, Poppins only

---

## A. Discovery / Audit (Step 0)

| Area | Temuan | Aksi |
| --- | --- | --- |
| Social Publishing (Fase 8) | **A — sudah ada**: model `social_publications` sudah punya `match_id`, 5 platform (WEBSITE/INSTAGRAM/TIKTOK/YOUTUBE/YOUTUBE_SHORTS), status per-platform, idempotency, retry limit 5, adapter API resmi, halaman Admin + composer + preview | REUSE. Hanya workflow UI disempurnakan |
| Commerce (Fase 9) | A — produk/varian/order/checkout lengkap | REUSE sebagai sumber konten social |
| Match Center (Fase 3/6) | A — relations endpoint, formasi, statistik, timeline, media, countdown | REUSE, ditambah H2H + report + share + score card |
| Match Event / Lineup | A — model & enum lengkap (GOAL, PENALTY_SCORED, ASSIST, kartu, substitusi; role STARTING/SUBSTITUTE/UNUSED) | Jadi sumber statistik derived |
| Player | **B — sebagian**: hanya CRUD, tanpa statistik | Ditambah endpoint statistik derived |
| Season / Competition | A | Dipakai untuk grouping statistik |
| News/CMS | **B — sebagian**: `posts.match_id` sudah ada, tapi belum ada penanda Match Report | Ditambah `post_type` (bukan CMS kedua) |
| Media | A — Media Library + `resolveMediaUrl` | REUSE |
| Admin Panel | A — sidebar sudah dikelompokkan (Klub/Kompetisi/Media & Konten/Merchandise/Sistem) | Polish kecil saja |
| Sharing utilities | **C — belum ada** (0 penggunaan `navigator.share`/clipboard) | Dibuat `ShareMatchday` |
| Score card generator | C — belum ada | Dibuat `MatchScoreCardGenerator` (canvas, tanpa dependency baru) |
| SEO | B — `usePageSeo` ada, tetapi 7 halaman publik belum memakainya **dan** SEO global menimpa SEO halaman | Diperbaiki (lihat J) |
| Design system | A — token + `Reveal`/`als-*` utilities | REUSE, tanpa redesign |

## B. Social Publishing — Final UI

- **Sumber konten eksplisit** (baru): `Berita / Match Report`, `Pertandingan`, `Album Galeri`, `Merchandise`, atau manual. Memilih item akan mengisi caption + judul otomatis dan mengaitkan `post_id` / `match_id` (field `match_id` sudah ada sejak Fase 8 → tidak ada perubahan model).
- **Pemilihan platform tetap independen** (checkbox tanpa default). Tidak ada platform yang dipaksa.
- **Preview diperkaya**: chip per platform dengan status jujur `NOT_SELECTED / NOT_CONFIGURED / READY / REQUIRES_APPROVAL / EXPIRED`, thumbnail media terpilih, blok khusus YouTube (judul, deskripsi, visibility) dan indikator **Shorts** (≤180 detik, vertikal/persegi).
- **Field deskripsi YouTube** kini tersedia di composer (sebelumnya hanya ada di payload).
- Retry / cancel / idempotency / batas attempt **tidak diubah** (arsitektur Fase 8 dipakai apa adanya). Tanpa kredensial → `NOT_CONFIGURED`, tidak pernah fake success.

## C. Player Season Statistics

- Endpoint baru: `GET /api/players/{player_id}/statistics?season_id=` — **100% derived** dari `match_lineups` + `match_events` + `matches` + `seasons`. Tidak ada input manual, tidak ada model agregasi baru, schema Player/Match **tidak berubah**.
- Metrik: `appearances`, `starts`, `substitute_appearances`, `goals` (GOAL + PENALTY_SCORED), `assists`, `yellow_cards` (YELLOW + SECOND_YELLOW), `red_cards`.
- **Anti angka 0 palsu**: bila musim tersebut belum punya Match Event apa pun, `goals/assists/kartu` dikembalikan `null` dan UI menampilkan `—` plus catatan penjelas. `UNUSED_SUBSTITUTE` tidak dihitung sebagai penampilan.
- UI: `components/public/PlayerSeasonStats.js` di `/players/:playerId` dengan season selector (muncul bila >1 musim) dan empty state profesional "Statistik belum tersedia".

## D. Head-to-Head

- Endpoint baru `GET /api/matches/{match_id}/head-to-head` **dan** disertakan langsung pada `GET /api/matches/{id}/relations` (`head_to_head`) sehingga Match Detail tidak menambah request.
- Sumber data: koleksi `matches` existing (status `FINISHED`, nama lawan case-insensitive). **Tidak ada koleksi H2H baru.**
- Output: matches played, wins/draws/losses, goals scored/conceded, 5 pertemuan terakhir dengan penanda M/S/K. Konvensi skor mengikuti `venue_type` + `home_score/away_score` (helper `_club_scores`).
- Tanpa riwayat → "Belum ada riwayat pertemuan." (tanpa data palsu).

## E. Match Report

- **CMS existing dipakai** (tidak ada CMS kedua): field additive `post_type` (`ARTICLE` | `MATCH_REPORT` | `ANNOUNCEMENT`) pada `PostBase`, default `ARTICLE` → seluruh post lama tetap valid.
- `post_type` masuk `filter_fields` posts, `/api/system/meta` (`post_types`), kolom + filter + field select di Admin → Content (dengan help text).
- Match Detail menampilkan kartu **Match Report** hanya bila ada post `MATCH_REPORT` + `PUBLISHED` yang tertaut ke match tersebut (`relations.match_report`). Bila tidak ada → tidak ada link/kartu (tanpa broken link).
- Semua relasi lain (skor, timeline, lineup, gallery, media, related news) sudah tersedia dari `relations` Fase 3/4.

## F. Share Matchday

- `components/public/ShareMatchday.js`: **Web Share API** (bila didukung), **WhatsApp** (`wa.me`), **Copy Link** (judul + skor/jadwal + URL).
- Tidak ada klaim posting otomatis ke Instagram Story. Alternatif resmi: **Download Match Card** (lihat G) untuk diunggah manual, atau lewat Social Publishing bila kredensial tersedia.

## G. Auto Score Card

- `components/public/matchcenter/MatchScoreCardGenerator.js` — canvas murni, **tanpa dependency baru**.
- Input hanya data nyata: logo klub (`club.logo`), nama/logo lawan, skor (atau `VS` bila belum ada), tanggal & kick-off, kompetisi + musim, venue, status (`MATCHDAY` / `FULL TIME` / `LIVE` / `DITUNDA` / `DIBATALKAN`), sisi HOME/AWAY/NEUTRAL.
- Rasio **1:1 (1080×1080)** dan **9:16 (1080×1920)** untuk Story/Shorts. Ukuran crest dihitung dari lebar teks skor terukur → **tidak pernah tumpang tindih**. Logo cross-origin dimuat dengan `crossOrigin=anonymous`; bila gagal → inisial gold (canvas tetap bersih sehingga `toBlob` berhasil).
- Aksi: **Download PNG** dan **Bagikan Kartu** (`navigator.share` dengan file, fallback ke download). Brand: hanya 4 warna resmi + Poppins.

## H. Admin Panel Polish

- Label opsi match di seluruh Admin (Content, Gallery, Match Lineups, Match Events) kini **terbaca**: `tanggal · vs Lawan · Home/Away (skor)` lewat helper baru `pages/admin/adminOptions.js` + dukungan `labelFn` di `ResourceManager` (sebelumnya menampilkan UUID/tanggal saja).
- `useRemoteOptions` distabilkan berdasarkan kumpulan endpoint → menghentikan pengambilan opsi berulang pada setiap render (perbaikan performa nyata, tanpa perubahan arsitektur).
- Footer sidebar yang usang ("Fase 4 — Match Gallery & Media") → "ALSABBAT Football Club · Admin".
- Grouping/navigasi, empty state, loading, error, konfirmasi, dan konsistensi form **sudah sesuai** hasil audit → tidak diubah (tidak ada dashboard baru, tidak ada perubahan arsitektur).

## I. Public Website Polish

- Match Detail disusun ulang sesuai alur ideal: Scoreboard → Countdown (upcoming) → Tabs (Formasi/Statistik/Timeline/Media) → **Head-to-Head** → **Match Report** → **Kartu Pertandingan** → **Bagikan Matchday** → Berita Terkait (sidebar). Grid 2+1 tetap rapi di desktop dan menumpuk di mobile.
- Player Detail mendapat section **Statistik Musim** di atas Biografi.
- Homepage **tidak dirombak** (Cinematic Hero, Matchday/Countdown, Next & Last Result, Berita, Player Spotlight + Squad, Prestasi, Galeri, Sponsor, Social, Footer sudah sesuai urutan yang diminta).
- Audit menyeluruh: **0** penggunaan `#222222`, **0** wording multi-team (`youth/reserve/second/first team/beberapa tim`), Staff Access tetap hanya di footer, Admin tidak muncul di header publik.

## J. SEO

- **Bug nyata ditemukan & diperbaiki**: `ClubContext` menerapkan SEO global setelah efek halaman selesai, sehingga **title/canonical/robots per halaman selalu tertimpa** oleh nilai default klub (canonical semua halaman menunjuk root). Solusi minimal: `lib/seo.js` kini punya `applyPageSeo` (halaman, prioritas) dan `applyDefaultSeo` (klub, tidak menimpa halaman aktif). Tidak ada sistem SEO kedua.
- `usePageSeo` menerima parameter `robots` opsional.
- 7 halaman publik yang belum punya SEO kini punya: Matches, News, Club, Cart, Checkout, Order Track, 404. Halaman transaksional & 404 diberi `noindex,follow`.
- Terverifikasi di browser: `/` → `Beranda | …`, `/matches` → canonical `/matches`, `/cart` → `noindex,follow`.
- Route baru publik: **tidak ada** (H2H, statistik, report, score card menempel pada route existing) → sitemap tetap valid tanpa perubahan.

## K. Accessibility

- Semua kontrol baru: `min-h-[44px]`, `aria-label`/`aria-pressed`, `role="group"`, `role="img"` + `aria-label` pada canvas, ikon `aria-hidden`, `<dl>/<dt>/<dd>` semantik untuk statistik, `Select` dengan `aria-label`.
- Animasi hanya memakai komponen `Reveal`/utility existing (opacity & transform). **Tidak ada `transition: all`** pada kode Fase 11 (sisa `transition-all` hanya di primitif shadcn yang tidak disentuh).
- Semua `<img>` (31) punya `alt`; thumbnail preview social memakai `loading="lazy"`.

## L. Performance

- Tanpa dependency baru (score card memakai Canvas API bawaan).
- H2H dihitung di endpoint relations yang sudah dipanggil → **0 request tambahan** di Match Detail. Statistik pemain: 1 request pada halaman pemain.
- Perbaikan pengambilan opsi berulang di Admin (`useRemoteOptions`).
- Bundle produksi: **242.2 kB gz** JS (+7.3 kB dari Fase 10) + 13.0 kB gz CSS.

## M. Security

- Endpoint baru bersifat **read-only publik** dan hanya memaparkan data yang sudah publik (match & player). Tidak ada data pribadi, tidak ada kredensial.
- Composer social tetap memakai permission existing (`social:read` / `social:publish`); sumber merchandise memakai `merchandise:read`. Tidak ada endpoint admin yang dibuka ke publik.
- Score Card sepenuhnya client-side dari data publik → **tidak menyentuh kredensial apa pun**. Tidak ada secret/payment/social token di frontend (scan ulang: 0 temuan).
- Rate limit, CORS, security headers, webhook signature, dan idempotency Fase 10 tidak diubah.

## N. Database Changes

- **Tidak ada koleksi baru. Tidak ada migrasi. Tidak ada data dummy.**
- Satu field additive: `posts.post_type` (default `ARTICLE`; dokumen lama tanpa field tetap dibaca sebagai artikel).
- Database produksi diverifikasi bersih setelah semua verifikasi: `teams 1` (ALSABBAT), `users 1` (admin), matches/players/posts/media/orders/products/social_publications = **0**.

## O. API Changes

| Endpoint | Sifat |
| --- | --- |
| `GET /api/players/{id}/statistics?season_id=` | **BARU** (publik, derived) |
| `GET /api/matches/{id}/head-to-head` | **BARU** (publik, derived) |
| `GET /api/matches/{id}/relations` | Additive: `match_report`, `head_to_head` |
| `GET /api/content/posts` | Additive: filter `post_type` |
| `POST/PATCH /api/content/posts` | Additive: field `post_type` |
| `GET /api/system/meta` | Additive: `post_types` |

## P. Files Changed

**Backend**: `models/enums.py` (PostType), `models/domain.py` (PostBase.post_type),
`api/routes/system.py` (meta), `api/routes/content.py` (filter), `api/routes/matches.py`
(`_club_scores`, `_head_to_head`, endpoint H2H, `match_report` + `head_to_head` di relations),
`api/routes/players.py` (endpoint statistik).

**Frontend (baru)**: `components/public/matchcenter/HeadToHeadPanel.js`,
`components/public/matchcenter/MatchScoreCardGenerator.js`, `components/public/ShareMatchday.js`,
`components/public/PlayerSeasonStats.js`, `pages/admin/adminOptions.js`.
**Frontend (diubah)**: `pages/public/MatchDetailPage.js`, `PlayerDetailPage.js`, `MatchesPage.js`,
`NewsPage.js`, `ClubPage.js`, `CartPage.js`, `CheckoutPage.js`, `OrderTrackPage.js`, `NotFoundPage.js`,
`pages/admin/AdminSocialPage.js`, `AdminContentPage.js`, `AdminGalleryPage.js`,
`AdminMatchEventsPage.js`, `AdminMatchLineupsPage.js`, `components/admin/AdminSidebar.js`,
`components/admin/ResourceManager.js`, `hooks/usePageSeo.js`, `lib/seo.js`, `context/ClubContext.js`.

**Skrip verifikasi (tidak menulis ke DB produksi)**: `scripts/phase11_logic_check.py`
(database sekali-pakai, otomatis di-drop), `scripts/phase11_preview_seed.py`
(menolak berjalan kecuali nama database mengandung `verify`/`check`).

## Q. Verification (tanpa Testing Agent)

| # | Uji | Hasil |
| --- | --- | --- |
| 1 | `yarn build` | ✅ Compiled successfully, 0 warning |
| 2 | `GET /api/health` | ✅ ok / database connected |
| 3 | Halaman publik `/`, `/matches`, `/news`, `/gallery`, `/merchandise`, `/cart`, `/club` | ✅ render, empty state benar |
| 4 | Match Detail | ✅ H2H, Match Report CTA, Score Card, Share Matchday, tabs Fase 6 utuh |
| 5 | Player Detail | ✅ Statistik Musim (2 penampilan · 1 starter · 1 pengganti · 1 gol · 1 assist · 1 kuning · 0 merah — sesuai data uji) |
| 6 | H2H logic | ✅ 3 pertandingan → 1M/1S/1K, gol 5-7, case-insensitive, upcoming tidak dihitung |
| 7 | H2H empty state | ✅ `available: false` untuk lawan tanpa riwayat |
| 8 | Player statistics logic | ✅ musim tanpa event → `goals/assists/kartu = null` (bukan 0); `UNUSED_SUBSTITUTE` tidak dihitung; filter musim benar; pemain tanpa lineup → `available: false` |
| 9 | Score Card 1:1 & 9:16 | ✅ 1080×1080 dan 1080×1920, `toDataURL` berhasil (canvas tidak ter-taint), skor tidak tumpang tindih, versi upcoming menampilkan `VS` |
| 10 | Share Matchday | ✅ tombol Bagikan / WhatsApp / Copy Link tampil & tertaut benar |
| 11 | Admin login | ✅ 200, redirect ke `/admin` |
| 12 | Admin Social Publishing UI | ✅ composer, sumber konten, preview platform (WEBSITE CONNECTED, IG/TikTok/YT `NOT_CONFIGURED`), deskripsi YouTube |
| 13 | Admin Content | ✅ kolom + filter + field `post_type` (Tipe) tersedia |
| 14 | RBAC | ✅ `/api/social/platforms`, `/api/merchandise/orders`, `/api/users`, `/api/media/storage/status` → 401 tanpa token, 200 dengan token |
| 15 | SEO | ✅ title/canonical/robots per halaman (bug penimpaan diperbaiki), `noindex` untuk cart/checkout/order/404 |
| 16 | Secret di frontend | ✅ 0 temuan |
| 17 | Brand scan | ✅ 0 `#222222`, hanya 4 warna resmi + Poppins |
| 18 | Multi-team wording | ✅ 0 temuan |
| 19 | Integritas data | ✅ verifikasi visual memakai database sekali-pakai; database produksi tetap bersih (0 match/player/post) dan sudah di-drop |
| 20 | Backward compatibility | ✅ Formasi, Statistik, Timeline, Countdown, Gallery, Media, News, Merchandise, Cart, Checkout, Orders, Social Publishing, Analytics tetap berfungsi |

## R. Known Limitations

1. **Instagram Story otomatis tidak tersedia** — Instagram Graph API tidak menyediakan publikasi Story untuk kasus ini, jadi disediakan Download/Share Match Card + share link (tanpa klaim palsu).
2. Publikasi nyata ke Instagram/TikTok/YouTube masih **NOT_CONFIGURED** (kredensial belum ada — akan diisi pada Fase 12).
3. Statistik pemain bergantung pada kelengkapan Match Lineup & Match Event; tanpa event, gol/assist/kartu tampil `—` (sengaja, bukan bug).
4. H2H mencocokkan **nama lawan** (case-insensitive) karena lawan bukan entitas ber-ID; penulisan nama lawan harus konsisten di Admin.
5. Score Card memuat logo lawan hanya bila URL-nya mengizinkan CORS; bila tidak, dipakai inisial gold agar kartu tetap bisa diunduh.
6. Halaman publik masih memakai empty state karena konten produksi nyata belum diisi (sesuai aturan tanpa data dummy).
7. Code splitting halaman admin belum dilakukan (P2, agar tidak merombak struktur `App.js`).

---

**STOP GATE 11** — tidak ada deployment, tidak ada konfigurasi produksi (Railway/Vercel/Atlas/domain/DNS/SSL/CDN),
tidak ada kredensial produksi (Midtrans/Instagram/TikTok/YouTube) yang diaktifkan atau diubah.
Fase 12 (Final Production Deployment) menunggu instruksi user.
