# ALSABBAT Football Club — PRD (living document)

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
