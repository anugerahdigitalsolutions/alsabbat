# FASE 1 Plan — ALSABBAT Football Club Digital Platform (Foundation) — UPDATED (FASE 1 SELESAI)

## 1) Objectives (final state)
- Establish **football-club-first** domain architecture (**Club → Teams/Players/Staff/Seasons/Competitions/Matches/Content/Gallery/Media/Sponsors**) with **MongoDB Atlas-ready** modeling + indexes.
- Deliver **secure, modular, deployment-ready** monorepo: **FastAPI (Railway-ready)** + **React (Vercel-ready)** with strict **environment-based configuration**.
- Implement **Admin auth (JWT) + RBAC** enforced on backend; protected admin routes on frontend.
- Implement **ALSABBAT design system** using design tokens (Primary `#FCCF2B`, Secondary `#012891`, Tertiary `#222222`, Light `#FEFEFE`) and responsive public/admin shells.
- Prepare **media architecture** (metadata in DB + pluggable storage provider; validation; no large files in DB) and provide minimal working upload path.
- Add foundations: **SEO/OG + analytics hooks**, health checks, logging, error handling.

**Status:** All objectives completed in Phase 1.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (core must work before expanding) — ✅ COMPLETED
User stories (delivered):
1. As a super admin, I can log in and receive a JWT so I can access protected admin APIs.
2. As a super admin, I can create/update a Club and set centralized brand/config so the platform isn’t hard-coded.
3. As a super admin, I can create a Team under the Club so multi-team architecture is proven.
4. As a content admin, I’m blocked from forbidden actions so RBAC is proven server-side.
5. As an admin, I can create a Match linked to season+competition+team so relationships are validated.

Steps (implemented + verified in POC script `/app/tests/test_core_phase1.py`):
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
- **Design tokens** centralized in `frontend/src/index.css` (ALSABBAT palette enforced).
- Public website shell:
  - Pages: `/`, `/news`, `/matches`, `/gallery`, `/club`, `404`
  - Components: header/footer/hero + section shells + loading/empty/error.
- Admin area:
  - `/admin/login` + protected `/admin/*`
  - Dashboard + System Status
  - 12 modules with CRUD via **generic `ResourceManager`**
  - Media library includes upload panel + metadata external URL
  - Role/permission matrix view.

---

### Phase 3 — Hardening, Security Baseline, and Deployment Readiness — ✅ COMPLETED
User stories (delivered):
1. As an operator, I can deploy backend to Railway with correct start commands and health checks.
2. As an operator, I can deploy frontend to Vercel and it points to the API via env var (no hard-coded URLs).
3. As a security reviewer, I can confirm no secrets are committed and rate limiting exists on auth endpoints.
4. As an admin, I get clear validation errors (400/422) instead of server crashes.
5. As a developer, I can run a single core regression script to catch foundation regressions.

Implemented deliverables:
- Deployment readiness:
  - `backend/Procfile`, `backend/railway.json`
  - `frontend/vercel.json` (SPA rewrites + basic headers)
- Environment examples:
  - `backend/.env.example`, `frontend/.env.example`
- Git readiness:
  - Root `.gitignore` updated (no `.env` committed, media storage ignored)
- Documentation:
  - `README.md`
  - `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/ENVIRONMENT.md`, `docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/DESIGN_SYSTEM.md`
  - `docs/PHASE_1_REPORT.md` (A–K report)
- Security baseline:
  - bcrypt password hashing
  - JWT sessions + logout revocation
  - RBAC enforcement in API
  - rate limiting
  - file type/size validation
  - CORS via env
  - consistent error envelope.

Verification policy update (per user instruction):
- **Only minimal critical verification** executed for Phase 1 completion:
  - frontend production build
  - backend startup + health
  - db config via env vars
  - authentication + protected routes
  - env safety (no hard-coded secrets/URIs)
  - fatal error scan.

---

## 3) Next Actions (immediate) — UPDATED
Phase 1 is finished. Do **not** start Phase 2 without instruction.

1. (Optional operational hardening before real production)
   - Set `ENVIRONMENT=production` in Railway.
   - Ensure `JWT_SECRET` is strong and unique.
   - Set `CORS_ORIGINS` to exact Vercel domains (avoid `*` in production).
   - Rotate/remove `BOOTSTRAP_ADMIN_PASSWORD` after initial setup.
2. (Optional infra)
   - Configure S3/R2 + CDN (`MEDIA_STORAGE_PROVIDER=S3`, `MEDIA_CDN_BASE_URL`, `S3_*`) when ready.
3. Await user instruction for the next phase:
   - **FASE 2 — OFFICIAL ALSABBAT FOOTBALL CLUB WEBSITE** (public website expansion on top of this foundation).

---

## 4) Success Criteria (Phase 1 exit) — ✅ MET
- ✅ POC script passes: login works, JWT works, RBAC blocks unauthorized actions, core domain relations persist in Mongo (**60/60**).
- ✅ Repo is GitHub-ready: clean structure, `.gitignore`, docs, no secrets committed, env-driven config.
- ✅ Frontend is Vercel-ready: `yarn build` compiles successfully, env-based API URL, responsive shells, loading/empty/error/404.
- ✅ Backend is Railway-ready: start commands, `/api/health`, CORS, logging, env-based Mongo connection.
- ✅ MongoDB Atlas-ready schema: consistent references + indexes for matches/content/slugs.
- ✅ Media architecture ready: metadata in DB + storage abstraction + validation + working upload path.
- ✅ Design system tokens applied with mandatory ALSABBAT colors; no scattered hard-coded brand hex.
- ✅ Delivered Phase-1 report A–K: `docs/PHASE_1_REPORT.md`.
- ✅ Explicitly **not built**: e-commerce/ticketing/membership/live match/advanced stats/social publishing (reserved for later phases).

**FASE 1 — FOUNDATION complete.**
