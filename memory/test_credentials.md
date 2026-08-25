# ALSABBAT Platform — Test Credentials (development only)

> These credentials exist for development/testing convenience.
> Remind the agent to remove/rotate them before production deployment.

## Bootstrap Super Admin (seeded idempotently on backend startup)

- Admin login URL: `/admin/login`
- Email: `admin@alsabbat.com`
- Password: `Alsabbat2026!`
- Role: `SUPER_ADMIN` (wildcard permission `*`)

Source of truth: `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`.
If the password env var is unset, the seed is skipped (no default password is baked in).

## Additional roles for RBAC testing

> Catatan Fase 5E (25 Jun 2026): seluruh akun test `content<timestamp>@alsabbat.com` (CONTENT_ADMIN)
> sudah DIHAPUS. Saat ini hanya ada satu akun: `admin@alsabbat.com` (SUPER_ADMIN).

Create via `POST /api/users` while logged in as the Super Admin, e.g.:

```json
{ "email": "content@alsabbat.com", "name": "Content Admin", "role": "CONTENT_ADMIN", "password": "ContentAdmin123!" }
```

Available roles: `SUPER_ADMIN`, `CONTENT_ADMIN`, `GALLERY_ADMIN`, `SOCIAL_MEDIA_ADMIN`, `STORE_ADMIN`, `ORDER_ADMIN`.
