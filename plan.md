# FASE 1 Plan — ALSABBAT Football Club Digital Platform (Foundation) — UPDATED (FASE 1–5A SELESAI)

## 1) Objectives (final state)
- Establish **football-club-first** domain architecture (**Club → Team/Squad → Players/Staff → Seasons/Competitions → Matches → Content/News → Gallery/Media → Sponsors**) with **MongoDB Atlas-ready** modeling + indexes.
- Deliver **secure, modular, deployment-ready** monorepo: **FastAPI (Railway-ready)** + **React (Vercel-ready)** with strict **environment-based configuration**.
- Implement **Admin auth (JWT) + RBAC** enforced on backend; protected admin routes on frontend.
- Implement **ALSABBAT design system** using design tokens (Primary `#FCCF2B`, Secondary `#012891`, Tertiary `#222222`, Light `#FEFEFE`) and **Poppins** as the **only** font.
- Prepare and use a single **Media architecture** (metadata in DB + pluggable storage provider; validation; no large files in DB; Local → S3/CDN ready).
- Add foundations: **SEO/OG + analytics hooks**, health checks, logging, error handling.
- Deliver **Match Center V1** (Match Detail, Lineups, Timeline Events) as additive modules with **professional empty states** and **backward-compatible relationships**.
- Deliver **Match Gallery & Media Management** (upload photo/video, multiple upload, media library, album publish workflow, album-media ordering, public gallery + lightbox/video player, match integration) **without creating a second media system**.
- Deliver **Cinematic UI & Visual Enhancement (Phase 5A)**: premium, dynamic, animated homepage experience with cinematic hero slider, micro-interactions, scroll reveal, and gallery highlight using existing published data.

**Status:** Phase 1, Phase 2, Phase 3, Phase 4, and **Phase 5A** objectives completed.

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
  - Multi-teams (architecture)
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
- `/api/matches/{match_id}/relations` returns:
  - `match`, `team`, `competition`, `season`
  - `lineups`, `events`, plus `players` joined map (minimal projection)
  - integration points preserved: `news`, `gallery_albums`, `images`, `videos`, `social_content`, `integration_points`.
- `/api/system/meta` updated: `lineup_roles`, `match_event_types`, `match_event_sides`.
- `/api/system/status` counts include `match_lineups` + `match_events`.

Verification:
- `tests/test_match_center_phase3.py` → **20/20 passed**, self-cleaning.

#### Phase 3B — Frontend Public (Match Detail) — ✅ DONE
Delivered:
- Route `/matches/:matchId` → `frontend/src/pages/public/MatchDetailPage.js`.
- `MatchCardShell` navigates to match detail (Link + keyboard focus ring).
- Match Center UI sections:
  - Scoreboard header (status, competition/season, score/VS, date/time/venue).
  - Tabs: **Susunan Pemain**, **Timeline**, **Media & Konten**.
  - Match Information panel, Related News, integration point placeholders.

#### Phase 3C — Frontend Admin (Lineups + Events CRUD) — ✅ DONE
Delivered:
- `/admin/match-lineups`, `/admin/match-events` using `ResourceManager`.
- Sidebar entries under “Kompetisi”.

#### Phase 3D — Polish + Manual Verification — ✅ DONE
Delivered:
- `frontend/public/index.html` updated: ALSABBAT title/meta, OG/Twitter, `lang="id"`, theme color `#012891`, Poppins.
- No favicon invented.

Verification:
- `npx esbuild ...` OK
- `/api/health` OK
- `tests/test_core_phase1.py` **60/60**
- `tests/test_match_center_phase3.py` **20/20**

---

### Phase 4 — Match Gallery & Media Management — ✅ COMPLETED (additive, backward-compatible)
**Guiding rules enforced (as implemented):**
- **Existing Media system reused** (MediaService + Media Library + existing upload endpoint). No second media system.
- **No media arrays embedded in Match**; relationship is Match → GalleryAlbum → Media.
- **Admin upload protected** by auth + RBAC, and existing validation (MIME + size limits).
- **Public only sees published albums**; DRAFT hidden.
- **No fake production data**; any verification data was development-only and removed.
- **No Testing Agent** used.

Implementation reference: `/app/docs/PHASE_4_REPORT.md`.

#### Phase 4A — Backend (Gallery publication + ordering + public endpoints) — ✅ DONE
Delivered (additive):
- Enums:
  - `GalleryStatus` (DRAFT, PUBLISHED, ARCHIVED) exposed via `/api/system/meta` as `gallery_status`.
- Domain extensions:
  - `GalleryAlbum`: `publish_status`, `published_at`, `display_order` (existing `match_id`, `cover_media_id`, etc. reused).
  - `Media`: `display_order` + auto-capture `width`/`height` on image upload (Pillow, best-effort).
- Indexes:
  - `gallery_albums`: `(publish_status, published_at)`
  - `media`: `(album_id, display_order)`
- Gallery API (additive):
  - Public:
    - `GET /api/gallery/public/albums` (published only; cover resolved; photo/video counts; match summary)
    - `GET /api/gallery/public/albums/{id}` (published only; ordered media)
  - Admin album-media management:
    - `POST /api/gallery/albums/{id}/media` attach existing Media IDs
    - `PATCH /api/gallery/albums/{id}/media/order` reorder via ordered id list
    - `DELETE /api/gallery/albums/{id}/media/{media_id}` detach (file stays in library)
    - `POST /api/gallery/albums/{id}/publish?publish=` publish/unpublish toggle
  - Existing `GET /api/gallery/albums/{id}/media` returns ordered items.
- Match relations enhancement:
  - `/api/matches/{id}/relations` additive keys:
    - `published_gallery_albums`
    - `match_media` (only media from PUBLISHED albums, ordered, includes album context)

Verification:
- `tests/test_gallery_phase4.py` → **25/25 passed**, self-cleaning.

#### Phase 4B — Admin (Upload → Library → Album → Publish) — ✅ DONE
Delivered:
- `/admin/media`:
  - Multiple file selection upload (simple sequential queue)
  - Upload progress + per-file queue status
  - Partial failure supported (one file fails doesn’t abort others)
  - Caption input added (alt text already supported)
- `/admin/gallery`:
  - `publish_status` field (DRAFT/PUBLISHED)
  - Row action to manage album media
- New `/admin/gallery/:albumId` page:
  - Pick existing media from Media Library (multi-select)
  - Order controls (up/down) persisted to backend
  - Set cover via `cover_media_id`
  - Edit caption + alt text (updates existing Media docs)
  - Detach media (keeps file in library)
  - Publish toggle
- `ResourceManager` additive enhancement: `rowActions` prop.

#### Phase 4C — Public Website (Published gallery + album detail + match integration) — ✅ DONE
Delivered:
- `/gallery` uses `GET /api/gallery/public/albums` (PUBLISHED only) + “Load more” pagination.
- `/gallery/:albumId` detail + photo lightbox + HTML5 video player (no autoplay, `preload="none"`).
- `/matches/:matchId` tab “Media & Konten” includes **MATCH MEDIA** section + CTA “View Full Gallery”.

#### Phase 4D — Polish (Brand + access rules + motion) — ✅ DONE
Delivered:
- Admin access removed from header/navigation.
- Subtle “Staff Access” link placed at the bottom of the footer.
- Motion tokens/classes added using only `transform`/`opacity`, honoring `prefers-reduced-motion`.

#### Phase 4E — Minimal Critical Verification (no Testing Agent) — ✅ DONE
Performed:
- `yarn build` PASS.
- `/api/health` PASS.
- Verified upload (photo/video), album creation, attach/order/cover, publish, public visibility, match detail integration.
- Regression:
  - `tests/test_core_phase1.py` **60/60**
  - `tests/test_match_center_phase3.py` **20/20**

All dev-only verification data removed afterward.

---

### Phase 5A — Cinematic UI & Visual Enhancement — ✅ COMPLETED (frontend-only)
**Scope rules / constraints (as implemented):**
- **Frontend-only**: backend not refactored/changed for Phase 5A.
- No Social Publishing, no Merchandise, no Match Statistics/Formation.
- No Testing Agent.
- **Poppins-only** and ALSABBAT color tokens preserved.
- No fake match/gallery data; hero uses real match/news/published gallery when available.

Implementation reference: `/app/docs/PHASE_5A_REPORT.md`.

#### Phase 5A1 — Homepage cinematic hero (priority) — ✅ DONE
Delivered:
- New component `CinematicHero`:
  - Full-width cinematic slider.
  - Autoplay **6s** per slide.
  - Transition crossfade **800ms**.
  - Prev/next, pause/play, pagination dots, counter (01/03).
  - Mobile swipe + keyboard arrow support.
  - Ken-burns image zoom on active slide (disabled under reduced motion).
  - Safe fallback when no suitable media.
  - Media priority: `match_cover` → published gallery album cover (`cover_url_resolved`) → latest news thumbnail.
- Hero slides (real data only):
  - Matchday (upcoming match)
  - Latest Result (finished match)
  - Latest News
  - Match Moments (published gallery highlight)

#### Phase 5A2 — Scroll reveal & micro interactions — ✅ DONE
Delivered:
- Hook: `useScrollReveal` + `usePrefersReducedMotion` (IntersectionObserver, no heavy deps).
- `SectionShell` enhanced with per-section reveal animations.
- Motion tokens added to `index.css`:
  - `.als-hero-slide`, `.als-kenburns`, `.als-lift`, `.als-reveal-hidden`, `.als-reveal-shown`
  - All animations are `transform/opacity` only; reduced motion respected.
- Micro interactions on cards/buttons (lift, subtle scale/overlay for media tiles).

#### Phase 5A3 — Homepage section upgrades (lightweight, data-driven) — ✅ DONE
Delivered:
- Premium **Matchday** cards (`MatchFeatureCard`) for Next Match and Full Time with CTA to match detail.
- Gallery highlight uses Phase 4 public albums via `/api/gallery/public/albums` + `AlbumCard`.
- Premium touches for News and Squad cards (lift + overlay + jersey badge), keeping existing data flows.

#### Phase 5A4 — Minimal critical verification (no Testing Agent) — ✅ DONE
Performed:
- `yarn build` PASS.
- `/api/health` ok.
- Homepage renders; hero controls verified: dots/next/prev/pause/counter.
- Mobile swipe works; keyboard arrows work.
- Gallery highlight uses published endpoint.
- Match card routes to `/matches/:matchId`.
- `/gallery` and `/news` render normally.
- Admin login still works (200).
- Regression:
  - `tests/test_core_phase1.py` **60/60**
  - `tests/test_match_center_phase3.py` **20/20**
  - `tests/test_gallery_phase4.py` **25/25**
- Dev-only verification data removed afterward.

---

## 3) Next Actions (immediate) — UPDATED
**Current target:** Plan Phase 5B (post-Phase 5A).

Recommended next actions (NOT started; keep modular/backward-compatible):
1. **Phase 5B — Inner Page Polish**: apply the cinematic visual language to inner pages (Matches, News detail, Club, Team/Player, Sponsors) without changing backend.
2. **Formation pitch visual** using `Match.formation` + `MatchLineup.pitch_slot` (later phase).
3. **Match statistics** aggregated from events/lineups (later phase).
4. **Social publishing module** on top of existing Media architecture (Instagram/TikTok/YouTube) — later phase.

---

## 4) Success Criteria (Phase 5A exit) — ✅ ACHIEVED
- ✅ Homepage hero full-width cinematic.
- ✅ Rotating slides with autoplay ~6s and smooth 800ms crossfade.
- ✅ Prev/next, pause/play, pagination dots, counter.
- ✅ Mobile swipe + keyboard support.
- ✅ Hero uses ALSABBAT data/media when available; safe fallback; no fake match data.
- ✅ Scroll reveal animation per section; micro interactions on cards/buttons.
- ✅ Matchday section feels premium (Next Match + Latest Result CTA to Match Detail).
- ✅ Gallery highlight uses published gallery data (Phase 4), not a new system.
- ✅ Admin remains hidden from header; Staff Access remains subtle in footer.
- ✅ Poppins-only; brand colors preserved; reduced motion respected.
- ✅ Performance preserved (lazy images where applicable; no video autoplay).
- ✅ Backward compatible: Phase 1–4 not broken.
- ✅ Minimal verification PASS; Testing Agent not used.
