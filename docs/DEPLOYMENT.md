# ALSABBAT Platform — Deployment

```
GitHub  ->  Vercel   (frontend/)
GitHub  ->  Railway  (backend/)  ->  MongoDB Atlas  ->  Media Storage / CDN
```

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
- [ ] `GET /api/docs` reachable (or disabled deliberately)
- [ ] Admin login works on the Vercel domain (no CORS errors)
- [ ] `GET /api/seo/sitemap.xml` and `/api/seo/robots.txt` respond
- [ ] Bootstrap admin password rotated after the first login
- [ ] `CORS_ORIGINS` narrowed to real domains
- [ ] `JWT_SECRET` is a strong, unique production value
