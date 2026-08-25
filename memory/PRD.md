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
| 5B | Inner Page Visual Polish | **SELESAI (25 Jun 2026)** |

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

## Verification (Fase 5B)
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
