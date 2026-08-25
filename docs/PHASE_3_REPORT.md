# ALSABBAT — Phase 3 Report: Match Center V1

Status: **COMPLETED** (additive, backward compatible with Phase 1 & 2)

## Scope delivered

### Backend
- Enums (`app/models/enums.py`): `LineupRole`, `MatchEventType`, `MatchEventSide`.
- Domain models (`app/models/domain.py`):
  - `MatchLineup` — **one document per player per match** (`match_id` + `team_id` + `player_id`),
    plus `role`, `position`, `position_label`, `pitch_slot` (reserved for a future formation
    visual), `shirt_number`, `is_captain`, `minutes_played`, `display_order`, `note`.
  - `MatchEvent` — `match_id`, `side` (CLUB/OPPONENT), `type`, `minute`, `minute_extra`,
    `player_id`, `related_player_id`, manual name fallbacks, `description`, `display_order`.
  - `Match` extended with **optional** `formation`, `opponent_formation`, `attendance`, `referee`.
    No media arrays were added to `Match`.
- Database (`app/core/database.py`): collections `match_lineups`, `match_events` with indexes,
  including a **unique index on (match_id, player_id)** → duplicate lineup returns HTTP 409.
- RBAC (`app/core/rbac.py`): new permissions `lineup:write`, `event:write`
  (Super Admin wildcard covers them; other roles unchanged).
- Routes: `/api/match-lineups`, `/api/match-events` (public read, protected write) built with the
  existing `crud_factory`.
- `/api/matches/{id}/relations` now returns `match`, `team`, `competition`, `season`, `lineups`,
  `events`, `players` (minimal join, no Player duplication) and the untouched integration points
  `news`, `gallery_albums`, `images`, `videos`, `social_content`, plus an `integration_points` map.
- `/api/system/meta` exposes `lineup_roles`, `match_event_types`, `match_event_sides`.
- `/api/system/status` counts include `match_lineups` and `match_events`.

### Frontend — public
- `/matches/:matchId` → `pages/public/MatchDetailPage.js`.
- Components in `components/public/matchcenter/`:
  `MatchScoreboard`, `MatchInfoPanel`, `MatchLineupSection`, `MatchTimeline`, `MatchMediaPanel`,
  `eventMeta.js` (event labels/icons/colors, minute + date formatting).
- Tabs: Susunan Pemain (Starting XI + Cadangan, optional formation badge), Timeline,
  Media & Konten (Gallery / Video / Social integration points, no upload/publishing).
- Sidebar: Match Information card + Related News.
- `MatchCardShell` is now a link to the match detail page (keyboard accessible).
- Professional empty states everywhere — **no seed/demo data is created**.

### Frontend — admin
- `AdminMatchLineupsPage` and `AdminMatchEventsPage` built on the generic `ResourceManager`.
- Routes `/admin/match-lineups`, `/admin/match-events` + sidebar entries under “Kompetisi”.

### Polish
- `public/index.html`: ALSABBAT title/description, Open Graph + Twitter meta, `lang="id"`,
  theme color `#012891`, Poppins preloaded (Inter removed). No favicon asset available, so none
  was invented.

## Verification (manual only — Testing Agent not used)
- `npx esbuild src/ --loader:.js=jsx --bundle` → success.
- `GET /api/health` → `status: ok`, database connected.
- `python tests/test_core_phase1.py` → **60 passed, 0 failed** (no regression).
- `python tests/test_match_center_phase3.py` → **20 passed, 0 failed** (self-cleaning test).
- Screenshots: match detail with data, empty states, `/matches` list navigation,
  admin login + lineups/events pages and lineup form dialog.
- All temporary development-only records created for UI verification were deleted afterwards.

## Out of scope (later phases)
Gallery/video upload, social publishing, formation pitch visual, live match updates,
player statistics aggregation, merchandise/ticketing.
