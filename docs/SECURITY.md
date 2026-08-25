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
| Rate limiting | Sliding-window limiter: login attempts, write operations and public analytics events, all configurable per environment. |
| CORS | `CORS_ORIGINS` allow-list from the environment; explicit method list. |
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
