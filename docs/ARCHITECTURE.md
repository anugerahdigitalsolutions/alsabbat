# ALSABBAT Platform — Architecture

## 1. System architecture

```
                        +---------------------+
   Supporters (mobile)  |   React SPA (Vercel)|
   Club admins (desktop)|  public + /admin    |
                        +----------+----------+
                                   | HTTPS, REACT_APP_BACKEND_URL + /api
                                   v
                        +---------------------+
                        | FastAPI (Railway)   |
                        |  /api/* modules     |
                        +----+-----------+----+
                             |           |
              Motor (async)  |           |  MediaService (abstraction)
                             v           v
                   +------------------+  +---------------------------+
                   | MongoDB Atlas    |  | LOCAL / S3 / CDN storage  |
                   | metadata + docs  |  | actual image/video files  |
                   +------------------+  +---------------------------+
```

Key rules:
- The frontend never talks to the database and never holds a secret.
- Every API route is prefixed with `/api`.
- Binary media never lives in MongoDB — only metadata plus a storage reference.

## 2. Backend module structure

```
app/
|-- core/
|   |-- config.py        environment-driven settings (dev / staging / production)
|   |-- database.py      Motor client, collection names, index bootstrap, ping
|   |-- security.py      bcrypt hashing, JWT issue/decode
|   |-- rbac.py          roles, permissions, role->permission matrix
|   |-- errors.py        typed errors + consistent JSON error envelope
|   |-- rate_limit.py    sliding-window limiter (login / write / public)
|   `-- logging_config.py structured stdout logging
|-- models/
|   |-- base.py          DBModel (uuid id + timestamps), shared value objects, PATCH model factory
|   |-- enums.py         all domain enumerations
|   |-- auth.py          admin user + auth payloads
|   `-- domain.py        Club, Team, Player, Staff, Season, Competition, Match,
|                        Post/Category/Tag/Author, Media, GalleryAlbum, Sponsor, Analytics
|-- api/
|   |-- deps.py          get_current_user, require_permission(...)
|   |-- crud_factory.py  Repository + build_crud_router (list/get/create/patch/delete)
|   |-- router.py        mounts every module under /api
|   `-- routes/          auth, users, club, teams, players, staff, seasons,
|                        competitions, matches, content, gallery, media,
|                        sponsors, system, analytics, seo
|-- services/
|   |-- media_service.py StorageBackend interface + LocalStorageBackend + S3StorageBackend
|   `-- bootstrap.py     idempotent super-admin + default club seeding
`-- main.py              app factory, CORS, error handlers, lifespan
```

### API surface (Phase 1)

| Module | Endpoints |
| --- | --- |
| System | `GET /api/health`, `GET /api/system/meta`, `GET /api/system/status` |
| Auth | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`, `GET /api/auth/roles` |
| Users | `GET/POST /api/users`, `PATCH/DELETE /api/users/{id}`, `POST /api/users/{id}/reset-password` |
| Club | `GET /api/club/active`, CRUD `/api/club` |
| Teams | CRUD `/api/teams` (filters: club_id, category, status) |
| Players | CRUD `/api/players` (filters: team_id, position, status) |
| Staff | CRUD `/api/staff` (filters: team_id, role, status) |
| Seasons | CRUD `/api/seasons` |
| Competitions | CRUD `/api/competitions` (filters: season_id, type) |
| Matches | CRUD `/api/matches`, `GET /api/matches/{id}/relations` |
| Content | CRUD `/api/content/posts` + `/categories` + `/tags` + `/authors`, `GET /api/content/posts/by-slug/{slug}` |
| Gallery | CRUD `/api/gallery/albums`, `GET /api/gallery/albums/{id}/media` |
| Media | CRUD `/api/media`, `POST /api/media/upload`, `GET /api/media/storage/status`, `GET /api/media/files/{path}`, `DELETE /api/media/{id}/hard` |
| Sponsors | CRUD `/api/sponsors` |
| Analytics | `POST /api/analytics/events`, `GET /api/analytics/summary` |
| SEO | `GET /api/seo/settings`, `GET /api/seo/sitemap.xml`, `GET /api/seo/robots.txt` |

Read endpoints for public domain data are open (the public website needs no login);
every write endpoint requires a JWT plus the matching permission.

## 3. Frontend structure

```
src/
|-- index.css                design tokens (brand colors, typography, spacing, radius, shadows)
|-- App.js                   routing: public shell + protected /admin area + 404
|-- context/
|   |-- AuthContext.js       JWT session, hasPermission(), login/logout
|   `-- ClubContext.js       centralized club config, meta enums, SEO, runtime theme override
|-- lib/
|   |-- api.js               axios instance (env base URL, bearer token, 401 handling)
|   |-- seo.js               title/description/OG/canonical injection
|   `-- analytics.js         page view + event tracking
|-- hooks/useResourceList.js consistent list fetching with loading/error states
|-- components/
|   |-- public/              PublicLayout, PublicHeader, PublicFooter, HeroClubShell,
|   |                        SectionShell, NewsCardShell, MatchCardShell, SponsorsStrip
|   |-- admin/               AdminShell, AdminSidebar, ProtectedRoute, StatCard,
|   |                        ResourceManager (generic CRUD engine), RolePermissionMatrix
|   `-- shared/              LoadingState, EmptyState, ErrorState, ClubCrestMark
`-- pages/
    |-- public/              HomePage, NewsPage, MatchesPage, GalleryPage, ClubPage, NotFoundPage
    `-- admin/               Login, Dashboard, Club, Teams, Players, Staff, Seasons,
                             Competitions, Matches, Content, Gallery, Media, Sponsors,
                             Users, System
```

`ResourceManager` is the reusable admin CRUD engine: it receives a column definition,
a field schema (supporting dot-paths such as `opponent.name` or `contact.email`),
filters and a required permission, then renders search, filters, table, pagination,
create/edit dialog, delete confirmation, and loading/empty/error states.
Adding a future module means declaring a schema, not rewriting UI.

## 4. Extensibility for later phases

| Future phase | Foundation already in place |
| --- | --- |
| Match Center | `Match` model + `/matches/{id}/relations` returning news, albums, images, videos, lineup placeholder |
| Full CMS | Post/Category/Tag/Author + slug uniqueness + SEO block per post |
| Gallery phase | Album → Media relation + upload pipeline + album media endpoint |
| Merchandise / Orders | `STORE_ADMIN` / `ORDER_ADMIN` roles with `store:manage` / `order:manage` permissions reserved |
| Social / YouTube publishing | `SOCIAL_MEDIA_ADMIN` role, `social:publish` permission, credential env vars declared but inactive |
| CDN migration | `MEDIA_STORAGE_PROVIDER=S3` + `MEDIA_CDN_BASE_URL`, no API change required |
