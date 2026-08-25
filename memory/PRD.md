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
| 5D | Production Data Cleanup | **SELESAI (25 Jun 2026)** |

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
### P0 (belum dibangun — fase berikutnya)
- Formation visual (pitch view) untuk lineup
- Match statistics & player statistics
### P1
- Live match & countdown matchday
- Social publishing (Instagram/TikTok/YouTube)
### P2
- Merchandise, cart, checkout, payment, membership, ticketing
