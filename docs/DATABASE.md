# ALSABBAT Platform — Database (MongoDB Atlas ready)

All documents use a **string UUID `id`** plus `created_at` / `updated_at` timestamps.
Relationships are expressed as string references (`*_id`) — no duplicated payloads.

## 1. Relationship map

```
Club (clubs)
 |-- Team (teams.club_id)
 |     |-- Player (players.team_id)
 |     `-- Staff  (staff.team_id)
 |-- Season (seasons.club_id)
 |     `-- Competition (competitions.season_id)
 |-- Match (matches.team_id, matches.season_id, matches.competition_id)
 |     |-- Post          (posts.match_id)
 |     |-- GalleryAlbum  (gallery_albums.match_id)
 |     `-- Media         (media.match_id)
 |-- Post (posts.category_id, posts.author_id, posts.tag_ids[], posts.team_id, posts.player_id)
 |-- GalleryAlbum -> Media (media.album_id)
 |-- Media (media.post_id, media.team_id, media.player_id)
 `-- Sponsor (sponsors)

Admin: users, sessions        Analytics: analytics_events
```

## 2. Collections & fields

### clubs
`name, short_name, logo, primary_color, secondary_color, tertiary_color, light_color,
description, founded_date, location, stadium, contact{email,phone,whatsapp,address},
official_website, social_media{instagram,facebook,twitter,tiktok,youtube,website},
seo{title,description,keywords[],og_image,canonical_url}, status`

### teams
`club_id, name, short_name, logo, description, category(FIRST_TEAM|RESERVE_TEAM|YOUTH_TEAM|WOMEN_TEAM|ACADEMY|OTHER), status`

### players
`team_id, full_name, display_name, photo, jersey_number(0-99),
position(GOALKEEPER|DEFENDER|MIDFIELDER|FORWARD), date_of_birth, nationality,
height_cm, weight_kg, bio, status(ACTIVE|INJURED|SUSPENDED|ON_LOAN|INACTIVE|RETIRED), social_media`

### staff
`team_id, name, photo, role(HEAD_COACH|ASSISTANT_COACH|GOALKEEPER_COACH|FITNESS_COACH|TEAM_MANAGER|MEDICAL_STAFF|ANALYST|KIT_MANAGER|OTHER), role_label, bio, social_media, status`

### seasons
`club_id, name, start_date, end_date, description, status(UPCOMING|ACTIVE|COMPLETED|ARCHIVED)`

### competitions
`season_id, name, logo, description, type(LEAGUE|CUP|TOURNAMENT|FRIENDLY), organizer, status`

### matches
`team_id, season_id, competition_id, opponent{name,short_name,logo}, date, time, venue,
venue_type(HOME|AWAY|NEUTRAL), status(SCHEDULED|UPCOMING|LIVE|FINISHED|POSTPONED|CANCELLED),
home_score, away_score, match_cover, description, lineup_ready, result_summary`

### posts / categories / tags / authors
`posts: title, slug(unique), thumbnail, excerpt, content, category_id, tag_ids[], author_id,
status(DRAFT|SCHEDULED|PUBLISHED|ARCHIVED), published_at, seo{...}, match_id, team_id, player_id, competition_id`
`categories: name, slug(unique), description, status`
`tags: name, slug(unique), status`
`authors: name, slug(unique), photo, bio, user_id, social_media, status`

### media
`file_name, file_type(IMAGE|VIDEO|DOCUMENT), mime_type, file_size, url,
storage_provider(LOCAL|S3|EXTERNAL), storage_key, thumbnail_url, width, height, duration,
alt_text, caption, uploaded_by, album_id, match_id, team_id, player_id, post_id, status`

### gallery_albums
`title, slug(unique), description, cover_url, cover_media_id, match_id, team_id, date, status, media_count`

### sponsors
`name, logo, description, website, tier, display_order, status`

### users / sessions
`users: email(unique), name, role, is_active, avatar_url, password_hash, last_login_at`
`sessions: jti(unique), user_id, ip, user_agent, revoked, expires_at`

### analytics_events
`event_type, path, referrer, entity_type, entity_id, metadata, session_id, user_agent`

## 3. Indexes

| Collection | Indexes |
| --- | --- |
| all domain collections | `id` (unique), `status`, `created_at` desc |
| users | `email` (unique), `id` (unique) |
| sessions | `jti` (unique), `user_id` |
| teams | `club_id + category` |
| players | `team_id + position`, `jersey_number`, text index on `full_name`/`display_name` |
| staff | `team_id + role` |
| seasons | `club_id + start_date` desc |
| competitions | `season_id + type` |
| matches | `date` desc, `season_id + competition_id + date` desc, `team_id + status` |
| posts | `slug` (unique), `status + published_at` desc, `category_id`, `tag_ids`, `match_id` |
| categories / tags / authors | `slug` (unique) |
| media | `file_type + created_at` desc, `album_id`, `match_id`, `team_id`, `player_id`, `post_id` |
| gallery_albums | `slug` (unique), `match_id` |
| sponsors | `display_order` |
| analytics_events | `created_at` desc, `event_type`, `entity_type + entity_id` |

Indexes are created automatically on application startup (`ensure_indexes`).
