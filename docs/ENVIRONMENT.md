# ALSABBAT Platform — Environment Configuration

Three stages are supported through environment variables only: **development**,
**staging**, **production** (`ENVIRONMENT`). No values are committed to the repository;
`*.env.example` files document the names only.

## Backend (Railway / local)

| Variable | Stage notes |
| --- | --- |
| `ENVIRONMENT` | `development` \| `staging` \| `production` |
| `APP_NAME`, `APP_VERSION`, `LOG_LEVEL`, `DEBUG` | Operational metadata |
| `MONGODB_URI` | MongoDB Atlas SRV connection string (required) |
| `MONGODB_DB_NAME` | Database name, e.g. `alsabbat_platform` |
| `JWT_SECRET` | **Required in production** (startup fails without it) |
| `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | Token policy |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Idempotent first super admin; seeding is skipped when the password is empty |
| `CORS_ORIGINS` | Comma separated allow-list; **exact domains required in production** (`*` aborts startup) |
| `ENABLE_API_DOCS` | `false` in production (Swagger UI closed); `true` only for debugging |
| `SECURITY_HEADERS_ENABLED` | Keep `true`; adds nosniff / frame-deny / referrer / permissions / HSTS |
| `RATE_LIMIT_ENABLED`, `RATE_LIMIT_LOGIN_MAX/WINDOW`, `RATE_LIMIT_CHECKOUT_MAX/WINDOW`, `RATE_LIMIT_WEBHOOK_MAX/WINDOW`, `RATE_LIMIT_WRITE_MAX/WINDOW`, `RATE_LIMIT_PUBLIC_MAX/WINDOW` | Security baseline (login/checkout/webhook are MongoDB-backed) |
| `MEDIA_STORAGE_PROVIDER` | `LOCAL` (dev) or `S3` (production object storage) |
| `MEDIA_LOCAL_DIR`, `MEDIA_CDN_BASE_URL` | Local path / CDN prefix |
| `MEDIA_MAX_IMAGE_MB`, `MEDIA_MAX_VIDEO_MB`, `MEDIA_MAX_DOCUMENT_MB` | Upload size limits |
| `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Object storage credentials (never in the repo) |
| `PUBLIC_SITE_URL` | Canonical site URL used by sitemap/SEO. When empty the API derives the origin from the `X-Forwarded-Proto/Host` proxy headers (never a hard-coded domain) |
| `PAYMENT_PROVIDER`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Payments (empty ⇒ `PAYMENT_NOT_CONFIGURED`, never a fake success) |
| `IG_USER_ID`, `IG_ACCESS_TOKEN`, `META_API_VERSION`, `META_GRAPH_HOST` | Instagram Graph API publishing |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`, `TIKTOK_DIRECT_POST_APPROVED`, `TIKTOK_PRIVACY_LEVEL` | TikTok Content Posting API v2 |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_API_KEY`, `YOUTUBE_CATEGORY_ID` | YouTube Data API v3 |

> Compatibility: when `MONGODB_URI` / `MONGODB_DB_NAME` are absent the backend falls back
> to `MONGO_URL` / `DB_NAME`, which keeps managed development environments working.

## Frontend (Vercel / local)

| Variable | Notes |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Backend origin without trailing slash and without `/api`. The client appends `/api`. |
| `REACT_APP_PUBLIC_BASE_URL` | Public website origin. Optional; used at build time by `scripts/generate-seo-files.js` to write `public/robots.txt`. |

Only public values may exist in the frontend environment. API keys, database credentials
and storage secrets are backend-only.

## Stage matrix example

| | development | staging | production |
| --- | --- | --- | --- |
| `ENVIRONMENT` | development | staging | production |
| `MONGODB_DB_NAME` | alsabbat_dev | alsabbat_staging | alsabbat_platform |
| `CORS_ORIGINS` | `*` | staging domain | production domains only |
| `MEDIA_STORAGE_PROVIDER` | LOCAL | S3 | S3 + CDN |
| `RATE_LIMIT_ENABLED` | true | true | true |
