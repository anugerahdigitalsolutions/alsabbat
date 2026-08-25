# ALSABBAT Football Club — Digital Platform

Official digital platform of **ALSABBAT Football Club**.
This repository contains **Fase 1 — Foundation**: a modular, secure, deployment-ready
foundation designed around the needs of a professional football club (not a generic
corporate website).

---

## 1. Project Overview

| Layer | Tech | Deploy target |
| --- | --- | --- |
| Frontend | React 19 (CRA + craco), TailwindCSS, shadcn/ui, react-router-dom | **Vercel** |
| Backend/API | FastAPI (modular `app/` package), Motor (async MongoDB) | **Railway** |
| Database | MongoDB (Atlas compatible) | **MongoDB Atlas** |
| Media | Metadata in MongoDB + pluggable storage provider (LOCAL / S3 / CDN) | **Object storage + CDN** |

```
GitHub
   |
   |-- frontend/  -> Vercel
   |
   `-- backend/   -> Railway -> MongoDB Atlas -> Media Storage / CDN
```

---

## 2. Folder Structure

```
ALSABBAT/
|
|-- backend/                    FastAPI service (Railway ready)
|   |-- app/
|   |   |-- core/               config, database, security, rbac, errors, rate limiting, logging
|   |   |-- models/             pydantic domain models + enums (source of truth for schemas)
|   |   |-- api/
|   |   |   |-- deps.py         auth + permission dependencies
|   |   |   |-- crud_factory.py generic repository + CRUD router factory
|   |   |   |-- router.py       aggregated API router
|   |   |   `-- routes/         one module per domain (club, teams, players, ...)
|   |   |-- services/           media service (storage abstraction), bootstrap seeding
|   |   `-- main.py             application factory (uvicorn entrypoint)
|   |-- server.py               managed-platform entrypoint (imports app.main:app)
|   |-- requirements.txt
|   |-- Procfile / railway.json production + health check configuration
|   `-- .env.example
|
|-- frontend/                   React app (Vercel ready)
|   |-- src/
|   |   |-- components/
|   |   |   |-- ui/             shadcn/ui primitives
|   |   |   |-- public/         public website shell (header, footer, hero, cards)
|   |   |   |-- admin/          admin shell, sidebar, ResourceManager (generic CRUD)
|   |   |   `-- shared/         loading / empty / error states, club crest
|   |   |-- context/            AuthContext (JWT), ClubContext (centralized club config)
|   |   |-- hooks/              data fetching hooks
|   |   |-- lib/                api client, seo helpers, analytics helpers
|   |   |-- pages/public/       Home, News, Matches, Gallery, Club, 404
|   |   |-- pages/admin/        Login, Dashboard + 12 module pages
|   |   |-- index.css           ALSABBAT design tokens (single source of truth)
|   |   `-- App.js              routing
|   |-- vercel.json
|   `-- .env.example
|
|-- shared/                     framework-agnostic shared constants
|-- docs/                       architecture, database, deployment, security, design system
|-- tests/                      Phase-1 core regression script
|-- .gitignore
`-- README.md
```

---

## 3. Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ with Yarn
- MongoDB (local) or a MongoDB Atlas connection string

### Backend
```bash
cd backend
cp .env.example .env          # fill MONGODB_URI, JWT_SECRET, BOOTSTRAP_ADMIN_PASSWORD
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```
API docs: `http://localhost:8001/api/docs` — health: `http://localhost:8001/api/health`

### Frontend
```bash
cd frontend
cp .env.example .env          # set REACT_APP_BACKEND_URL
yarn install
yarn start                    # dev server
yarn build                    # production build (Vercel output: build/)
```

### Core regression script
```bash
python tests/test_core_phase1.py    # 60 assertions: auth, RBAC, all domain relationships
```

---

## 4. Environment Variables

All configuration is environment driven. **No secret is ever hard-coded, and no secret is
stored in the frontend or the repository.** See `backend/.env.example` and
`frontend/.env.example` for the full list, and [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md)
for the meaning of each variable.

Backend (names only): `ENVIRONMENT`, `APP_NAME`, `APP_VERSION`, `LOG_LEVEL`, `DEBUG`,
`MONGODB_URI`, `MONGODB_DB_NAME`, `JWT_SECRET`, `JWT_ALGORITHM`,
`ACCESS_TOKEN_EXPIRE_MINUTES`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`,
`BOOTSTRAP_ADMIN_NAME`, `CORS_ORIGINS`, `RATE_LIMIT_*`, `MEDIA_STORAGE_PROVIDER`,
`MEDIA_LOCAL_DIR`, `MEDIA_CDN_BASE_URL`, `MEDIA_MAX_IMAGE_MB`, `MEDIA_MAX_VIDEO_MB`,
`MEDIA_MAX_DOCUMENT_MB`, `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT_URL`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `PUBLIC_SITE_URL`, `INSTAGRAM_APP_ID`,
`INSTAGRAM_APP_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `YOUTUBE_CLIENT_ID`,
`YOUTUBE_CLIENT_SECRET`, `YOUTUBE_API_KEY`.

Frontend: `REACT_APP_BACKEND_URL`.

---

## 5. Database Setup (MongoDB Atlas)

1. Create an Atlas cluster and a database user.
2. Allow the Railway egress IPs (or `0.0.0.0/0` for testing) in Network Access.
3. Set `MONGODB_URI` and `MONGODB_DB_NAME` in the backend environment.
4. On startup the API automatically:
   - verifies connectivity (`ping`),
   - creates all indexes (see [docs/DATABASE.md](docs/DATABASE.md)),
   - seeds the bootstrap super admin and the default club configuration (idempotent).

---

## 6. Build & Deployment Overview

- **Frontend → Vercel**: root directory `frontend`, build `yarn build`, output `build`,
  env `REACT_APP_BACKEND_URL`. SPA rewrites are declared in `frontend/vercel.json`.
- **Backend → Railway**: root directory `backend`, start command
  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`.
- Full step-by-step: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

---

## 7. Security Notes

- JWT (HS256) access tokens with server-side session records; logout revokes the session.
- Passwords hashed with bcrypt (cost 12). Passwords are never returned by the API.
- Role-based permissions enforced in the API layer (`require_permission`), not only in the UI.
- Input validation via pydantic; upload validation on MIME type and file size.
- Sliding-window rate limiting on login, writes and public analytics endpoints.
- CORS origins configured per environment; admin routes protected on both API and router level.
- Details: [docs/SECURITY.md](docs/SECURITY.md).

---

## 8. Documentation

| Document | Contents |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System, backend module and frontend structure |
| [docs/DATABASE.md](docs/DATABASE.md) | Entities, relationships, indexes |
| [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) | Environment variables per stage |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub → Vercel / Railway / Atlas |
| [docs/SECURITY.md](docs/SECURITY.md) | Security baseline |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Brand colors and design tokens |
| [docs/PHASE_1_REPORT.md](docs/PHASE_1_REPORT.md) | Phase 1 acceptance report (A–K) |

---

## 9. Phase Scope

**Built in Phase 1:** repository/deployment readiness, Club, Teams, Players, Staff,
Seasons, Competitions, Matches, Content (Post/Category/Tag/Author), Media, Gallery,
Sponsors, Admin authentication, Role & permission architecture, design system,
responsive public shell, admin dashboard, SEO and analytics foundations.

**Intentionally not built (later phases):** merchandise/e-commerce, cart, checkout,
payment, orders, customer accounts, membership, supporter points, ticketing, advanced
player statistics, live match system, social media auto publishing (Instagram/TikTok),
YouTube upload and Shorts upload.

Next phase: **Fase 2 — Official ALSABBAT Football Club Website.**
