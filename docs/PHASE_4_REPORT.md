# ALSABBAT — Phase 4 Report: Match Gallery & Media Management

Status: **COMPLETED** (additive; Phase 1, 2 and 3 untouched)

## A. Media Architecture (existing system reused)
No second media system was created. Phase 4 builds on the Phase 1 foundation:
- `MediaService` (`app/services/media_service.py`) — pluggable storage (LOCAL / S3 / EXTERNAL),
  MIME allow-list, per-type size limits, safe filename + key builder.
- `POST /api/media/upload` — the single upload endpoint (photo **and** video).
- `Media` entity handles both photo and video (`file_type` = IMAGE / VIDEO); no separate
  Photo/Video collections.
- Additive extensions only:
  - `Media.display_order` (album ordering)
  - image `width` / `height` captured on upload (Pillow, best-effort, never blocks an upload)
  - index `(album_id, display_order)`

## B. Gallery Architecture
`GalleryAlbum` (collection `gallery_albums`) extended additively with:
- `publish_status` (`DRAFT` / `PUBLISHED` / `ARCHIVED`, default DRAFT), `published_at`, `display_order`
- existing fields reused: `title`, `description`, `match_id`, `team_id`, `cover_media_id`,
  `cover_url`, `date`, `status`, `media_count`, `slug`
- index `(publish_status, published_at)`

New endpoints (all additive, existing ones unchanged):
| Endpoint | Purpose |
|---|---|
| `GET /api/gallery/public/albums` | published albums + resolved cover + photo/video counters + match summary |
| `GET /api/gallery/public/albums/{id}` | published album detail + ordered media |
| `POST /api/gallery/albums/{id}/media` | attach **existing** media (no re-upload) |
| `PATCH /api/gallery/albums/{id}/media/order` | manual ordering |
| `DELETE /api/gallery/albums/{id}/media/{media_id}` | detach only (file stays in the library) |
| `POST /api/gallery/albums/{id}/publish?publish=` | publish / unpublish |
| `GET /api/gallery/albums/{id}/media` | now ordered by `display_order` |

## C. Match Integration
```
Match  ->  GalleryAlbum (match_id)  ->  Media (album_id, display_order)
```
No media arrays were embedded in `Match`. `GET /api/matches/{id}/relations` gained two
additive keys: `published_gallery_albums` and `match_media` (media of PUBLISHED albums,
ordered, each carrying `album_id` + `album_title`). One match can have several albums.

## D. Admin Workflow
`Upload (multi-file) → Media Library → Create Album → link to Match → pick existing media →
cover + order + caption/alt → Publish`
- `/admin/media` — multiple photo/video selection, per-file queue status, upload progress,
  partial failure never aborts the batch, caption + alt text fields, external/CDN metadata.
- `/admin/gallery` — album CRUD with `publish_status`, DRAFT/PUBLISHED badges, per-row
  “kelola media” action.
- `/admin/gallery/:albumId` — media picker from the library (multi-select), order up/down,
  set cover, edit caption/alt text, detach, publish toggle.

## E. Public Website
- `/gallery` — only PUBLISHED albums; card shows cover, title, related match, date, media
  total and photo/video indicators; “muat album lainnya” pagination.
- `/gallery/:albumId` — cover header, title/description, match link, photo grid with
  lightbox (prev/next/close + Escape / ArrowLeft / ArrowRight), HTML5 video cards.
- `/matches/:matchId` → tab **Media & Konten** now opens with a **MATCH MEDIA** grid
  (max 6 tiles) and a `View Full Gallery` CTA; empty state “Match gallery belum tersedia”.
- Phase 3 sections (score, match information, lineup, timeline, related news) untouched.
- Admin entry point removed from the header/navigation; a subtle **Staff Access** link now
  sits at the very bottom of the footer (auth + RBAC remain the real security).

## F. Storage
`Application → MediaService → Storage → CDN` unchanged. Development uses LOCAL disk
(`MEDIA_LOCAL_DIR`), production is S3-compatible + `MEDIA_CDN_BASE_URL` ready. MongoDB only
stores metadata/references — never binaries.

## G. Security
Existing baseline reused: MIME allow-list + size limit per media type, safe filename/key
generation, path-traversal-protected local file serving, `media:write` / `gallery:write`
permissions, write rate limiting. Verified: disallowed MIME → 422, anonymous upload → 401.
Public endpoints expose PUBLISHED albums only (DRAFT detail → 404).

## H. Performance
- `loading="lazy"` on every gallery/album image, thumbnails preferred over originals.
- Album list paginated (24 per page, “load more”), album media capped per request.
- Videos: `preload="none"`, poster/thumbnail, **no autoplay**, never used as background.
- Motion animates only `transform` / `opacity`, short durations, `prefers-reduced-motion`
  respected globally; no `transition: all`.

## I. Verification (minimal critical only — Testing Agent NOT used)
- `yarn build` → production build PASS.
- `GET /api/health` → `ok`, database connected.
- `python tests/test_gallery_phase4.py` → **25 passed, 0 failed** (self-cleaning): photo
  upload (+dimensions), video upload, disallowed MIME rejected, anonymous upload blocked,
  album create → attach existing media → cover → order → publish, DRAFT hidden publicly,
  published album visible with counters/cover/match, ordered media, `match_media` in match
  relations, detach keeps file in library.
- Regression: `tests/test_core_phase1.py` → **60/60**, `tests/test_match_center_phase3.py` → **20/20**.
- UI screenshots: `/gallery`, `/gallery/:id` (+ lightbox with keyboard nav), match detail
  Media tab with MATCH MEDIA + CTA, Phase 3 lineup/timeline tabs still rendering, admin
  login, admin album media manager, admin Media Library.
- All development-only records/files created during verification were deleted (public albums
  back to 0, no `DEV`/`PHASE4` media left, storage clean).

## J. Scope (explicitly NOT built)
Social publishing (Instagram / TikTok / YouTube / Shorts / Facebook), social scheduler,
merchandise, cart, checkout, payment, orders, membership, ticketing, live streaming, video
transcoding/FFmpeg pipeline, adaptive bitrate, multi-team UI/workflow. The Media entity stays
publisher-agnostic so a future `Media → Social Publisher` layer can consume it.

## K. Recommended next phase (not started)
1. **UI/Visual Enhancement** — full-width cinematic hero with rotating banner (5–7s autoplay,
   700–1000ms transition, pagination, prev/next, swipe).
2. **Formation pitch visual** using `Match.formation` + `MatchLineup.pitch_slot`.
3. **Match statistics** aggregated from lineups/events.
4. **Social publishing module** on top of the existing Media architecture.
