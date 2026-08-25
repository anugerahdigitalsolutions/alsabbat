# FASE 1 Plan — ALSABBAT Football Club Digital Platform (Foundation) — UPDATED (FASE 1–3 SELESAI)

## 1) Objectives (final state)
- Establish **football-club-first** domain architecture (**Club → Teams/Players/Staff/Seasons/Competitions/Matches/Content/Gallery/Media/Sponsors**) with **MongoDB Atlas-ready** modeling + indexes.
- Deliver **secure, modular, deployment-ready** monorepo: **FastAPI (Railway-ready)** + **React (Vercel-ready)** with strict **environment-based configuration**.
- Implement **Admin auth (JWT) + RBAC** enforced on backend; protected admin routes on frontend.
- Implement **ALSABBAT design system** using design tokens (Primary `#FCCF2B`, Secondary `#012891`, Tertiary `#222222`, Light `#FEFEFE`) and **Poppins** as the **only** font.
- Prepare **media architecture** (metadata in DB + pluggable storage provider; validation; no large files in DB) and provide minimal working upload path.
- Add foundations: **SEO/OG + analytics hooks**, health checks, logging, error handling.
- Deliver **Match Center V1** (Match Detail, Lineups, Timeline Events) as additive modules with **professional empty states** and **backward-compatible relationships**.

**Status:** Phase 1, Phase 2, and **Phase 3** objectives completed.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (core must work before expanding) — ✅ COMPLETED
User stories (delivered):
1. As a super admin, I can log in and receive a JWT so I can access protected admin APIs.
2. As a super admin, I can create/update a Club and set centralized brand/config so the platform isn’t hard-coded.
3. As a super admin, I can create a Team under the Club so multi-team architecture is proven.
4. As a content admin, I’m blocked from forbidden actions so RBAC is proven server-side.
5. As an admin, I can create a Match linked to season+competition+team so relationships are validated.

Steps (implemented + verified in POC script `/app/tests/test_core_phase1.py`):
- Seed idempotent super admin (`admin@alsabbat.com`) + roles/permissions.
- Health check + DB connectivity (`/api/health`).
- Login (`/api/auth/login`) + `me` + invalid/missing token rejection.
- Create and validate relationships:
  - Club centralized config + brand colors
  - Multi-teams
  - Player + Staff
  - Season → Competition → Match chain
  - Match filtering
- CMS foundation:
  - Category/Tag/Author/Post
  - Slug uniqueness returns **409**
- Media architecture:
  - Metadata + real upload via Media Service (`/api/media/upload`)
  - Disallowed MIME rejected
- Gallery:
  - Album → Media relation
- Sponsors
- RBAC proof:
  - Content Admin blocked from club/match/user/system writes (403)
- Match relations endpoint:
  - `/api/matches/{id}/relations`
- Analytics:
  - track event + admin summary
- SEO:
  - `/api/seo/settings`, `/api/seo/sitemap.xml`, `/api/seo/robots.txt`
- Logout revokes session (old token returns 401).

**Result:** POC PASS **60/60** assertions.

---

### Phase 2 — V1 App Development (Foundation build-out) — ✅ COMPLETED
User stories (delivered):
1. As a visitor, I can see a responsive public shell (header/nav/footer) that reflects ALSABBAT identity.
2. As a visitor, I see proper loading/empty/error states and a 404 page so UX is robust.
3. As an admin, I can log in and see an Admin Dashboard with navigation and System Status.
4. As an admin, I can perform basic CRUD for foundation entities to validate architecture end-to-end.
5. As an admin, I can attach Media metadata (URL + type + validation) and upload through Media Service without storing files in DB.

Backend (implemented):
- Modular FastAPI app under `backend/app/`:
  - `core/` (config, security, db, RBAC, errors, rate limiting, logging)
  - `models/` (domain models + enums)
  - `api/routes/` modules: auth, users, club, teams, players, staff, seasons, competitions, matches, content, gallery, media, sponsors, system, analytics, seo
  - `services/` media storage abstraction + bootstrap seed
- MongoDB indexes auto-created on startup.
- Health checks + system status + meta enums endpoints.

Frontend (implemented):
- **Design tokens** centralized in `frontend/src/index.css` (ALSABBAT palette enforced) + **Poppins** loaded and used for all typography.
- Public website shell:
  - Pages: `/`, `/news`, `/matches`, `/gallery`, `/club`, `404`
  - Components: header/footer/hero + section shells + loading/empty/error.
- Admin area:
  - `/admin/login` + protected `/admin/*`
  - Dashboard + System Status
  - CRUD modules via **generic `ResourceManager`**
  - Media library includes upload panel + metadata external URL
  - Role/permission matrix view.

---

### Phase 3 — Match Center V1 (Match Detail + Lineups + Events) — ✅ COMPLETED (additive, backward-compatible)
**Scope rules / constraints (as implemented):**
- **Additive only**: Phase 1/2 architecture unchanged.
- **No fake seed/demo data**: no invented opponents/players/scores/events; empty DB → professional empty states.
- **Media/gallery/video/news/social**: preserved **relationship/reference** approach (Match → GalleryAlbum, Match → Media, Match → Post, Match → Social Content). **No media arrays embedded in Match**.
- **Formation**: optional field supported; **no pitch visual** in Phase 3; architecture prepared for later.
- **No Testing Agent**: verification performed manually + lightweight scripts.
- Brand: **Poppins-only**, colors `#FCCF2B`, `#012891`, `#222222`, `#FEFEFE`.

Implementation reference: `/app/docs/PHASE_3_REPORT.md`.

#### Phase 3A — Backend (domain + API) — ✅ DONE
Delivered:
- Enums in `app/models/enums.py`:
  - `LineupRole` (STARTING, SUBSTITUTE, UNUSED_SUBSTITUTE)
  - `MatchEventType` (GOAL, OWN_GOAL, ASSIST, PENALTY_SCORED, PENALTY_MISSED, YELLOW_CARD, SECOND_YELLOW_CARD, RED_CARD, SUBSTITUTION, OTHER)
  - `MatchEventSide` (CLUB, OPPONENT)
- Domain models in `app/models/domain.py`:
  - `MatchLineup` as **1 doc per player per match**: `match_id`, `team_id`, `player_id` + role/position/shirt_number/captain/minutes/display_order/note, plus `pitch_slot` reserved for future formation visual.
  - `MatchEvent` timeline docs with player references and manual name fallbacks (for opponent players not in DB).
  - `Match` extended with optional fields: `formation`, `opponent_formation`, `attendance`, `referee` (no breaking changes).
- Database (`app/core/database.py`):
  - Collections `MATCH_LINEUPS`, `MATCH_EVENTS`
  - Indexes including **unique index on (match_id, player_id)** to prevent duplicate lineup player entries.
- RBAC (`app/core/rbac.py`): permissions added:
  - `lineup:write`, `event:write`
- API routes:
  - `/api/match-lineups` CRUD (public read, protected write)
  - `/api/match-events` CRUD (public read, protected write)
- `/api/matches/{match_id}/relations` now returns:
  - `match`, `team`, `competition`, `season`
  - `lineups`, `events`, plus `players` joined map (minimal projection) to avoid Player duplication
  - integration points preserved: `news`, `gallery_albums`, `images`, `videos`, `social_content`, `integration_points` metadata.
- `/api/system/meta` updated: `lineup_roles`, `match_event_types`, `match_event_sides`.
- `/api/system/status` counts include `match_lineups` + `match_events`.

Verification:
- `tests/test_match_center_phase3.py` → **20/20 passed**, self-cleaning (creates then deletes temporary records).

#### Phase 3B — Frontend Public (Match Detail) — ✅ DONE
Delivered:
- Route `/matches/:matchId` → `frontend/src/pages/public/MatchDetailPage.js`.
- `MatchCardShell` now navigates to match detail (Link + keyboard focus ring).
- Match Center UI sections:
  - Scoreboard header (status, competition/season, score/VS, date/time/venue).
  - Tabs: **Susunan Pemain** (Starting XI + Cadangan), **Timeline**, **Media & Konten**.
  - Match Information panel (team/competition/season/venue/status, optional formation/referee/attendance).
  - Related News (empty state if none).
  - Integration points (Gallery / Videos / Social) with **empty states**; no publishing/upload.
- Professional empty states when lineup/events/media/news absent.

Verification:
- Manual UI screenshots captured for match detail (data + empty), timeline empty state, navigation from `/matches`.

#### Phase 3C — Frontend Admin (Lineups + Events CRUD) — ✅ DONE
Delivered:
- Admin pages using `ResourceManager`:
  - `/admin/match-lineups` (`AdminMatchLineupsPage.js`)
  - `/admin/match-events` (`AdminMatchEventsPage.js`)
- Admin navigation updated (sidebar entries under “Kompetisi”).
- Uses backend meta enums for select options.

Verification:
- Manual UI screenshots captured: admin login, lineups/events empty states, lineup form dialog.

#### Phase 3D — Polish + Manual Verification — ✅ DONE
Delivered:
- `frontend/public/index.html` updated:
  - ALSABBAT title/meta (description + OG + twitter)
  - `lang="id"`, theme color `#012891`
  - Poppins font link; removed Inter reference
  - Favicon: **not changed** (no asset available; none invented)

Verification performed (no Testing Agent):
- `npx esbuild ...` → OK
- `GET /api/health` → OK
- `python tests/test_core_phase1.py` → **60/60 passed** (no regression)
- `python tests/test_match_center_phase3.py` → **20/20 passed**
- Confirmed: no permanent dev-only seed data remains.

---

## 3) Next Actions (immediate) — UPDATED
**Current target:** Begin Phase 4 planning (post-Phase 3).

Suggested next actions (out of scope for Phase 3, kept modular/backward-compatible):
1. **Formation pitch visual** using `Match.formation` + `MatchLineup.pitch_slot` (no migration required).
2. **Gallery/video workflows** (admin publishing/upload) using existing `Media` + `GalleryAlbum` relations.
3. **Social publishing module** (reserved architecture) using separate Social Content resources.
4. **Player/match statistics** (aggregation endpoints + UI), derived from events/lineups rather than duplicating player data.

---

## 4) Success Criteria (Phase 3 exit) — ✅ ACHIEVED
- ✅ Backend provides additive endpoints:
  - `/api/match-lineups` and `/api/match-events` CRUD with RBAC enforcement.
  - `/api/matches/{id}/relations` returns `match`, `team`, `competition`, `season`, `news`, `gallery_albums`, `images`, `videos`, `lineups`, `events`, `players` join map, and integration placeholders; empty arrays when no data.
  - `/api/system/meta` includes lineup/event enums.
- ✅ Frontend public:
  - Match cards navigate to `/matches/:matchId`.
  - Match detail renders match info, lineup groups, timeline events, and integration-point placeholders.
  - Professional empty states (no fake data).
- ✅ Frontend admin:
  - Admin pages for lineups/events available and permissions respected.
- ✅ Branding:
  - `public/index.html` updated to ALSABBAT title/description and Poppins-only.
  - Favicon unchanged due to missing asset (no invented files).
- ✅ Verification (manual only):
  - build check OK, `/api/health` OK, match detail + empty states OK, `/matches` navigation OK, admin auth OK, Phase 1 regression OK.

**Note:** Publishing/upload for gallery/video/social content, formation pitch visual, and statistics remain out of scope for Phase 3 and are candidates for a future phase.