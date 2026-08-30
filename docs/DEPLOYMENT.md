# ALSABBAT Platform — Deployment

The platform runs on a **self-hosted aaPanel + Nginx server**. That is the
authoritative deployment path and is documented in section A below.

Sections 1–6 describe the alternative managed-platform path (Vercel + Railway +
MongoDB Atlas). Keep them for reference, but do **not** apply them to the
aaPanel servers — the two paths use different storage and database settings.

```
Current (authoritative):
  aaPanel + Nginx  ->  React build (static)   ->  staging.alsabbat.com
                   ->  FastAPI/uvicorn        ->  api-staging.alsabbat.com
                   ->  MongoDB (local)        ->  alsabbat_platform_staging
                   ->  Media                  ->  LOCAL disk

Alternative (managed):
  GitHub  ->  Vercel (frontend/)
  GitHub  ->  Railway (backend/)  ->  MongoDB Atlas  ->  S3 / CDN
```

## A. aaPanel + Nginx (current deployment)

### A.1 Environments

Two fully separated environments on the same stack. Never let one reach into the
other's database or media directory.

| | staging | production |
| --- | --- | --- |
| Branch | `staging` | `main` |
| Frontend | `https://staging.alsabbat.com` | `https://alsabbat.com` |
| API | `https://api-staging.alsabbat.com` | `https://api.alsabbat.com` |
| `ENVIRONMENT` | `staging` | `production` |
| `MONGODB_DB_NAME` | `alsabbat_platform_staging` | `alsabbat_platform` |
| `MEDIA_STORAGE_PROVIDER` | `LOCAL` | `LOCAL` |
| `CORS_ORIGINS` | `https://staging.alsabbat.com` | exact production origins (no `*`) |
| `ENABLE_API_DOCS` | `true` | `false` |

A wildcard `CORS_ORIGINS=*` is rejected at startup when
`ENVIRONMENT=production` (see `resolve_cors_origins()` in `backend/app/main.py`).

### A.2 Configuration

`.env` files are **not** tracked in git — each server keeps its own. Templates
with every supported variable are committed:

- `backend/.env.example`  → copy to `backend/.env`
- `frontend/.env.example` → copy to `frontend/.env`

```bash
cp backend/.env.example backend/.env    # then fill in the real values
cp frontend/.env.example frontend/.env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # JWT_SECRET
```

Use a **different** `JWT_SECRET` per environment so a staging token can never
authenticate against production.

### A.3 Backend (Python / FastAPI)

Runs under uvicorn, bound to localhost only; Nginx terminates TLS and proxies to
it. Never expose port 8001 publicly.

```bash
cd /www/wwwroot/api-staging.alsabbat.com
python3 -m venv venv && source venv/bin/activate
pip install -r backend/requirements.txt
# Start command (aaPanel Python project manager / systemd / pm2):
uvicorn app.main:app --host 127.0.0.1 --port 8001 --app-dir backend
```

- Health check: `/api/health` → `{"status":"ok","database":"connected"}`
- Indexes and the idempotent super-admin seed run automatically at startup. The
  seed never overwrites an existing password.

### A.4 Frontend (React + CRACO, Node 20)

`REACT_APP_*` variables are inlined at **build** time, so the bundle must be
rebuilt after any change — restarting Nginx is not enough.

```bash
cd /www/wwwroot/staging.alsabbat.com
yarn install          # no yarn.lock is tracked; package.json is the source of truth
yarn build            # outputs to frontend/build
```

Point the Nginx site root at `frontend/build`.

> **Trap — do not commit build output.** `yarn build` runs
> `scripts/generate-seo-files.js`, which rewrites the tracked file
> `frontend/public/robots.txt` and stamps a `Sitemap:` line built from the
> `REACT_APP_BACKEND_URL` of the machine that ran the build. If that change is
> committed, the staging (or preview) domain leaks into the repository and then
> into production. After building, always discard it:
>
> ```bash
> git checkout -- frontend/public/robots.txt
> ```
>
> Keep `CI=false` for the build, otherwise the existing eslint warnings are
> promoted to errors and the build fails.

### A.5 Nginx

The SPA needs a history fallback, and `/api` must reach the backend. Media is
served by the API at `/api/media/files/...`, so no extra media location block is
required.

```nginx
# ---- staging.alsabbat.com (frontend) ----
root /www/wwwroot/staging.alsabbat.com/frontend/build;
index index.html;

location / {
    try_files $uri $uri/ /index.html;      # deep links such as /admin/players
}

location ~* \.(js|css|png|jpg|jpeg|gif|svg|webp|woff2?)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# index.html must never be cached, or users keep the old bundle after a deploy
location = /index.html {
    add_header Cache-Control "no-store, must-revalidate";
}

# ---- api-staging.alsabbat.com (backend) ----
location / {
    proxy_pass http://127.0.0.1:8001;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Must be >= the largest MEDIA_MAX_*_MB value, otherwise Nginx rejects
    # uploads with 413 before FastAPI ever sees them (MEDIA_MAX_VIDEO_MB=200).
    client_max_body_size 220M;
    proxy_read_timeout   300s;
    proxy_send_timeout   300s;
}
```

### A.6 Media storage (LOCAL)

Uploads go to `MEDIA_LOCAL_DIR` on the server disk and are served through
`/api/media/files/...`.

- Keep `MEDIA_LOCAL_DIR` **outside** the folder replaced on each release, or
  every deploy wipes user uploads. Example: `/www/wwwroot/alsabbat_media_staging`.
- The directory must be writable by the user running uvicorn.
- Set `MEDIA_LOCAL_PERSISTENT=true` on the server. This is a reporting flag used
  by `/api/media/storage/status`; it never changes where files are written.
- Include the media directory in the server backup schedule — it is the only
  copy of the binaries.
- Staging and production must use **separate** media directories.

### A.7 Deploying an update to staging

```bash
cd /www/wwwroot/api-staging.alsabbat.com
git checkout staging && git pull origin staging
source venv/bin/activate && pip install -r backend/requirements.txt
# restart the backend service, then:
curl -s https://api-staging.alsabbat.com/api/health

cd /www/wwwroot/staging.alsabbat.com
git checkout staging && git pull origin staging
yarn install && yarn build
git checkout -- frontend/public/robots.txt   # discard build-generated change
```

Verify the whole configuration with:

```bash
python scripts/staging_config_verify.py https://api-staging.alsabbat.com
```

Never deploy the `staging` branch onto the production sites, and never point a
staging `.env` at `alsabbat_platform`.

---

## 1. GitHub

1. Confirm nothing sensitive is tracked: `git status`, and that `.env` files are ignored.
2. Commit and push:
   ```bash
   git init && git add . && git commit -m "Phase 1: ALSABBAT foundation"
   git remote add origin git@github.com:<org>/alsabbat.git && git push -u origin main
   ```
3. `.gitignore` already excludes `.env*` (except `.env.example`), `node_modules/`,
   `__pycache__/`, `build/`, logs and `backend/media_storage/`.

## 2. MongoDB Atlas

1. Create a cluster (M0 is enough to start) and a database user with read/write access.
2. Network Access: add the Railway egress IPs (or `0.0.0.0/0` while testing).
3. Copy the SRV connection string → Railway variable `MONGODB_URI`.
4. Set `MONGODB_DB_NAME` (e.g. `alsabbat_platform`).
5. Indexes and the idempotent bootstrap seed run automatically at startup.

## 3. Railway (backend/API)

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Build | `pip install -r requirements.txt` (Nixpacks auto-detects) |
| Start command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/api/health` |

Required variables: `ENVIRONMENT=production`, `MONGODB_URI`, `MONGODB_DB_NAME`,
`JWT_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `CORS_ORIGINS`,
`PUBLIC_SITE_URL`, plus media/storage variables when using S3.
`Procfile` and `railway.json` in `backend/` already encode the production command and
health check. Verify with `curl https://<service>.up.railway.app/api/health`.

## 4. Vercel (frontend)

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework preset | Create React App |
| Build command | `yarn build` |
| Output directory | `build` |
| Environment | `REACT_APP_BACKEND_URL=https://<service>.up.railway.app` |

`frontend/vercel.json` provides SPA rewrites (deep links such as `/admin/players` work on
reload), static asset caching and baseline security headers.
After the first deploy, add the Vercel domain(s) to the backend `CORS_ORIGINS`.

## 5. Media storage / CDN

Development uses `MEDIA_STORAGE_PROVIDER=LOCAL`. For production:

1. Create an S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2 ...).
2. Set `MEDIA_STORAGE_PROVIDER=S3`, `S3_BUCKET_NAME`, `S3_REGION`,
   `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and `S3_ENDPOINT_URL` for non-AWS).
3. Put a CDN in front and set `MEDIA_CDN_BASE_URL`.
4. No application code changes are required — the Media Service is provider agnostic.

## 6. Post-deploy checklist

- [ ] `GET /api/health` returns `status: ok` and `database: connected`
- [ ] `ENVIRONMENT=production` and `CORS_ORIGINS` lists the exact domains (a `*` aborts startup)
- [ ] `ENABLE_API_DOCS=false` (Swagger closed) — `/api/docs` returns 404
- [ ] Admin login works on the Vercel domain (no CORS errors)
- [ ] `GET /api/seo/sitemap.xml` and `/api/seo/robots.txt` respond
- [ ] `PUBLIC_SITE_URL` set → canonical/OG URLs use the final domain
- [ ] Frontend redeployed after the domain is final (build regenerates `public/robots.txt`)
- [ ] Midtrans Payment Notification URL → `https://<backend>/api/merchandise/payment/webhook`
- [ ] Bootstrap admin password rotated after the first login
- [ ] `JWT_SECRET` is a strong, unique production value
