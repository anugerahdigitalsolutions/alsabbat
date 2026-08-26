# ALSABBAT Platform — Security Baseline (Phase 1)

| Area | Implementation |
| --- | --- |
| Input validation | Pydantic models for every write endpoint (types, lengths, ranges, hex-color patterns, enum values). Invalid payloads return `422` with a structured error envelope. |
| Authentication | Email + password login issuing a JWT (HS256) with `sub`, `role`, `perms`, `jti`, `iat`, `exp`, `iss`. A session document is stored per token. |
| Session management | `POST /api/auth/logout` revokes the session (`jti`); revoked or unknown sessions are rejected even if the JWT is still cryptographically valid. Password change revokes all other sessions. |
| Password handling | bcrypt with cost 12. Hashes never leave the backend; `password_hash` is stripped from all responses. |
| Authorization | `require_permission(...)` dependency on every write route. Role → permission matrix in `app/core/rbac.py`. Enforcement is server-side; the UI only hides what the API already forbids. |
| Protected admin routes | Frontend `ProtectedRoute` + backend permission checks. A 401 response clears the local token and redirects to `/admin/login`. |
| File type validation | Upload MIME type must be in the allow-list per media type (image/video/document). Unknown types are rejected with `422`. |
| File size validation | Per-type limits from `MEDIA_MAX_IMAGE_MB`, `MEDIA_MAX_VIDEO_MB`, `MEDIA_MAX_DOCUMENT_MB`. |
| Path traversal | Local media serving resolves the path and verifies it stays inside `MEDIA_LOCAL_DIR`. |
| Rate limiting | Two layers: in-memory fixed window for general write/public traffic, **MongoDB-backed counters** (collection `rate_limits`, TTL-expiring) for sensitive endpoints — login, checkout and payment webhook — so limits hold across multiple Railway instances. Falls back to the in-memory window if MongoDB is momentarily unavailable. |
| CORS | `CORS_ORIGINS` allow-list from the environment; explicit method list. **Startup fails fast when `ENVIRONMENT=production` and the list is empty or contains `*`.** `allow_credentials` is only enabled for an explicit origin list. |
| Security headers | Backend middleware sets `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and (production) `Strict-Transport-Security`. Vercel adds the same baseline for static assets. |
| API docs exposure | `/api/docs` and `/api/openapi.json` are disabled in production unless `ENABLE_API_DOCS=true`. |
| Stored XSS on uploads | Locally served `.svg`/`.html` media is returned as `Content-Disposition: attachment` with `nosniff`, so user-uploaded markup is never rendered inline. |
| Payment integrity | Snap session created server-side; totals, prices and stock always resolved server-side. Webhook signature verified (SHA-512 `order_id+status_code+gross_amount+server_key`), amount cross-checked against the order, terminal statuses are idempotent, and stock is decremented exactly once after a verified payment. A **frontend redirect is never trusted**: pending orders are reconciled against the official Midtrans Status API (`GET /v2/{order_id}/status`, signature verified) on order tracking and admin order detail. |
| Order access control | Guest tracking requires order number **and** the exact customer email; admin order routes require `order:read` / `order:write`. Provider payloads are stripped from every response. |
| Error handling | Central handlers for typed app errors, validation errors, duplicate keys, database failures and unhandled exceptions. Stack traces are logged, never returned. |
| Secret management | Every credential is read from environment variables. `.env*` is git-ignored (only `.env.example` is committed). `JWT_SECRET` is mandatory in production. |
| Frontend secrets | The frontend only receives `REACT_APP_BACKEND_URL`. No API keys, database URIs or storage credentials are shipped to the browser. |
| Logging | Structured stdout logging with failed-login warnings including the source IP. |

## Development-only convenience

A bootstrap super admin is seeded from `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`
so the platform can be tested immediately (see `/app/memory/test_credentials.md`).
**Rotate this password (or remove the variables) before going live.**

## Recommended hardening for later phases

- Refresh-token rotation and shorter access-token lifetime.
- Distributed rate limiting (Redis) once multiple API instances run.
- Audit log collection for administrative writes.
- Signed/expiring URLs for private media once object storage is enabled.
- 2FA for Super Admin accounts.
