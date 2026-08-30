# ALSABBAT Platform — Environment Configuration

Three stages are supported through environment variables only: **development**,
**staging**, **production** (`ENVIRONMENT`). No values are committed to the repository;
`*.env.example` files document the names only.

## Backend (aaPanel server / local)

| Variable | Stage notes |
| --- | --- |
| `ENVIRONMENT` | `development` \| `staging` \| `production` |
| `APP_NAME`, `APP_VERSION`, `LOG_LEVEL`, `DEBUG` | Operational metadata |
| `MONGODB_URI` | Connection string. `mongodb://localhost:27017` on the aaPanel server; an Atlas SRV string on managed hosting |
| `MONGODB_DB_NAME` | Database name: `alsabbat_platform_staging` (staging) / `alsabbat_platform` (production) |
| `JWT_SECRET` | **Required in production** (startup fails without it) |
| `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` | Token policy |
| `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` | Idempotent first super admin; seeding is skipped when the password is empty |
| `CORS_ORIGINS` | Comma separated allow-list; **exact domains required in production** (`*` aborts startup) |
| `ENABLE_API_DOCS` | `false` in production (Swagger UI closed); `true` only for debugging |
| `SECURITY_HEADERS_ENABLED` | Keep `true`; adds nosniff / frame-deny / referrer / permissions / HSTS |
| `RATE_LIMIT_ENABLED`, `RATE_LIMIT_LOGIN_MAX/WINDOW`, `RATE_LIMIT_CHECKOUT_MAX/WINDOW`, `RATE_LIMIT_WEBHOOK_MAX/WINDOW`, `RATE_LIMIT_WRITE_MAX/WINDOW`, `RATE_LIMIT_PUBLIC_MAX/WINDOW` | Security baseline (login/checkout/webhook are MongoDB-backed) |
| `MEDIA_STORAGE_PROVIDER` | `LOCAL` on all aaPanel environments. `S3`/`EMERGENT` only on managed hosting — do not set these on the aaPanel server |
| `MEDIA_LOCAL_DIR`, `MEDIA_CDN_BASE_URL` | Local upload path (keep it outside the release folder) / optional CDN prefix |
| `MEDIA_LOCAL_PERSISTENT` | `true` on a real server disk, `false` on ephemeral containers. Reporting flag for `/api/media/storage/status`; does not change where files are written |
| `MEDIA_MAX_IMAGE_MB`, `MEDIA_MAX_VIDEO_MB`, `MEDIA_MAX_DOCUMENT_MB` | Upload size limits |
| `S3_BUCKET_NAME`, `S3_REGION`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Object storage credentials (never in the repo) |
| `PUBLIC_SITE_URL` | Canonical site URL used by sitemap/SEO. When empty the API derives the origin from the `X-Forwarded-Proto/Host` proxy headers (never a hard-coded domain) |
| `PAYMENT_PROVIDER`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION` | Payments (empty ⇒ `PAYMENT_NOT_CONFIGURED`, never a fake success) |
| `IG_USER_ID`, `IG_ACCESS_TOKEN`, `META_API_VERSION`, `META_GRAPH_HOST` | Instagram Graph API publishing |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`, `TIKTOK_DIRECT_POST_APPROVED`, `TIKTOK_PRIVACY_LEVEL` | TikTok Content Posting API v2 |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`, `YOUTUBE_API_KEY`, `YOUTUBE_CATEGORY_ID` | YouTube Data API v3 |

> Compatibility: when `MONGODB_URI` / `MONGODB_DB_NAME` are absent the backend falls back
> to `MONGO_URL` / `DB_NAME`, which keeps managed development environments working.

## Frontend (aaPanel static build / local)

| Variable | Notes |
| --- | --- |
| `REACT_APP_BACKEND_URL` | Backend origin without trailing slash and without `/api`. The client appends `/api`. Inlined at **build** time — re-run `yarn build` after changing it. |
| `REACT_APP_PUBLIC_BASE_URL` | Public website origin. Optional; used at build time by `scripts/generate-seo-files.js` to write `public/robots.txt`. |
| `CI`, `GENERATE_SOURCEMAP` | Build behaviour: keep `CI=false` so lint warnings do not fail the build; `GENERATE_SOURCEMAP=false` for a smaller server build. |

Only public values may exist in the frontend environment. API keys, database credentials
and storage secrets are backend-only.

## Stage matrix (current aaPanel deployment)

| | development | staging | production |
| --- | --- | --- | --- |
| `ENVIRONMENT` | development | staging | production |
| Branch | any | `staging` | `main` |
| Frontend | localhost:3000 | staging.alsabbat.com | alsabbat.com |
| API | localhost:8001 | api-staging.alsabbat.com | api.alsabbat.com |
| `MONGODB_DB_NAME` | alsabbat_platform_staging | **alsabbat_platform_staging** | **alsabbat_platform** |
| `CORS_ORIGINS` | `*` | staging domain | production domains only |
| `MEDIA_STORAGE_PROVIDER` | LOCAL | **LOCAL** | **LOCAL** |
| `MEDIA_LOCAL_PERSISTENT` | false (ephemeral) | true (server disk) | true (server disk) |
| `ENABLE_API_DOCS` | true | true | false |
| `RATE_LIMIT_ENABLED` | true | true | true |

Staging and production run on the same self-hosted aaPanel + Nginx stack but are
fully separated: different database, different media directory and a different
`JWT_SECRET`. Never point a staging `.env` at `alsabbat_platform`.

Media uses local server disk (not S3) — see `docs/DEPLOYMENT.md` section A for
the Nginx configuration and the media-directory persistence rules.

Verify a deployed environment with:

```bash
python scripts/staging_config_verify.py https://api-staging.alsabbat.com
```
