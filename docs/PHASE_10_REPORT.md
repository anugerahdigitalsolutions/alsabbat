# FASE 10 — PRODUCTION FINALIZATION (Laporan)

Tanggal: 26 Juni 2026 · Sifat perubahan: **additive & minimal** · Fase 1–9 tidak dirombak
Testing Agent: **TIDAK dijalankan** (permintaan user) — verifikasi manual via curl + screenshot.
Data produksi: **tidak ada data dummy dibuat, tidak ada data asli dihapus.**

---

## A. Source Hygiene

| Item | Hasil |
| --- | --- |
| `.env` ter-commit? | **Tidak.** `git ls-files` → hanya `memory/test_credentials.md` (dev doc, bukan secret produksi). `.gitignore` sudah memblokir `.env`, `.env.*`, `*.pem`, `*.key`, `service-account*.json`, `media_storage/`, `test_reports/`. |
| Secret di frontend | **Bersih.** Scan pola (`sk_`, `AIza`, `SG.`, `*_SERVER_KEY`, `*_CLIENT_SECRET`, password literal) di `frontend/src` → 0 temuan. Frontend hanya memakai `REACT_APP_BACKEND_URL`. |
| `.env.example` | Diperbarui total (backend) agar akurat: menambah payments (Midtrans), social tokens riil yang dipakai adapter (`IG_USER_ID`, `IG_ACCESS_TOKEN`, `TIKTOK_ACCESS_TOKEN`, `YOUTUBE_REFRESH_TOKEN`, dst), rate limit baru, `ENABLE_API_DOCS`, `SECURITY_HEADERS_ENABLED`, `CORS_ORIGINS` tidak lagi berisi `*`. Frontend `.env.example` menambah `REACT_APP_PUBLIC_BASE_URL`. |
| Skrip audit/cleanup fase 5C–5E | **DIPERTAHANKAN** (`scripts/phase5c_*`, `phase5d_*`, `phase5e_cleanup.py`) — utilitas maintenance & jejak audit. Tidak ada yang dihapus. |
| Test files | **DIPERTAHANKAN** (`tests/test_core_phase1.py`, `test_match_center_phase3.py`, `test_gallery_phase4.py`). **TIDAK dijalankan** (menulis ke database). |
| Brand `#222222` | 0 sisa di kode. 2 sisa di dokumentasi (`docs/DESIGN_SYSTEM.md`, `docs/PHASE_1_REPORT.md`) → diganti `#000000`. Font tetap Poppins tunggal. |
| File dihapus | **Tidak ada.** |

## B. Deployment Readiness

| Target | Status |
| --- | --- |
| Vercel (frontend) | `frontend/vercel.json` sudah ada: build `yarn build`, output `build`, SPA rewrite (deep link `/admin/...` aman), cache immutable `/static/*`, header keamanan. Ditambah `prebuild` script yang men-generate `robots.txt` dari environment. `yarn build` → **Compiled successfully** (234.95 kB gz JS, 13.01 kB gz CSS). |
| Railway (backend) | `backend/Procfile` + `backend/railway.json`: start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, healthcheck `/api/health`, restart ON_FAILURE. |
| MongoDB Atlas | Index dipastikan otomatis saat startup. **Baru di Fase 10**: TTL index `rate_limits.expires_at` (dokumen rate-limit menghapus diri sendiri) + index `social_publications` (`id` unik, `post_id+platform`, `status+created_at`) yang sebelumnya belum ada. Koneksi tetap `MONGODB_URI`/`MONGODB_DB_NAME` (fallback `MONGO_URL`/`DB_NAME`). |
| Media storage | Binary tidak pernah masuk MongoDB — hanya metadata. Provider pluggable `LOCAL` / `S3` + `MEDIA_CDN_BASE_URL`; `media_storage/` git-ignored. |
| Domain | **Tidak ada domain di-hard-code.** Semua lewat env: `PUBLIC_SITE_URL`, `CORS_ORIGINS`, `REACT_APP_BACKEND_URL`, `REACT_APP_PUBLIC_BASE_URL`. |

## C. Security

Perubahan Fase 10 (semua minimal & additive):

1. **CORS produksi anti-wildcard** — `ENVIRONMENT=production` + `CORS_ORIGINS` kosong/`*` ⇒ startup gagal dengan pesan eksplisit. `allow_credentials` hanya aktif untuk origin eksplisit. (Terverifikasi.)
2. **Security headers middleware** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, dan `Strict-Transport-Security` khusus produksi.
3. **API docs tertutup di produksi** — `/api/docs` & `/api/openapi.json` = `None` kecuali `ENABLE_API_DOCS=true`. (Terverifikasi.)
4. **Rate limiting MongoDB-backed** untuk endpoint sensitif saja: `login` (`login_guard`), `checkout` (`checkout_guard`), `payment/webhook` (`webhook_guard`). Counter di collection `rate_limits` dengan TTL; fallback ke limiter in-memory bila MongoDB sesaat tidak tersedia. Endpoint lain tetap memakai limiter in-memory yang sudah ada (tidak dirombak).
5. **Payment integrity** — status pembayaran **tidak pernah** dipercaya dari redirect frontend. Selain webhook bertanda tangan, order PENDING direkonsiliasi via **Midtrans Status API resmi** (`GET /v2/{order_id}/status`, signature SHA-512 diverifikasi ulang) saat *Lacak Order* dan saat admin membuka detail order. Logika apply status disatukan (`_apply_payment_status`) → idempotent: status terminal tidak bisa ditimpa, stok berkurang **tepat satu kali** setelah pembayaran terverifikasi, nominal notifikasi dicek terhadap total order.
6. **Stored-XSS upload** — media lokal ber-ekstensi `.svg`/`.svgz`/`.html` disajikan sebagai `attachment` + `nosniff` (tidak dirender inline).
7. Tidak berubah (sudah aman sejak fase awal): bcrypt cost 12, JWT + session revocation, RBAC server-side pada semua write, validasi MIME & ukuran upload, proteksi path traversal, order access control (order number + email tepat), secret hanya di backend.

## D. SEO

| Item | Status |
| --- | --- |
| Title / description / OG / canonical | `usePageSeo` per halaman + default di `index.html`. Canonical memakai `seo.site_url` dari backend (`PUBLIC_SITE_URL`). |
| Origin publik tanpa domain palsu | `_site_url()` kini: `PUBLIC_SITE_URL` → header proxy `X-Forwarded-Proto/Host` → `base_url`. Sebelumnya bisa menghasilkan URL internal `http://…`. (Terverifikasi: canonical kini `https://…`.) |
| `robots.txt` | Dua lapis: backend `/api/seo/robots.txt` (dinamis) + `frontend/public/robots.txt` yang di-*generate* saat build (`prebuild`) dengan `Sitemap:` absolut dari env. Tanpa env pun file tetap valid (tanpa direktif Sitemap). Disallow: `/admin`, `/cart`, `/checkout`. |
| `sitemap.xml` | `/api/seo/sitemap.xml` dinamis (home, news, matches, gallery + slug published). Valid meski domain belum final. |
| 404 | Route catch-all → `NotFoundPage` (render OK). |
| Favicon / manifest | **Baru**: `favicon.svg` (warna brand: #012891, #FCCF2B, #000000) + `manifest.webmanifest` (theme `#012891`, background `#000000`) + tautan di `index.html`. Sebelumnya tidak ada favicon/manifest sama sekali. |

## E. Performance & Accessibility

- Bundle produksi: 234.95 kB gz JS + 13.01 kB gz CSS — wajar untuk cakupan fitur; tanpa dependency baru di Fase 10.
- Gambar: 31 `<img>` seluruhnya punya `alt`; gambar non-hero memakai `loading="lazy"` (hero sengaja `eager` demi LCP). Media lokal kini dikirim dengan `Cache-Control: public, max-age=86400`; `/static/*` immutable 1 tahun via Vercel.
- Font: satu keluarga (Poppins) dengan `preconnect` + `display=swap`.
- Aksesibilitas: fokus ring & target sentuh ≥44px sudah menjadi konvensi sejak Fase 5B; `lang="id"`; `color-scheme` diset.
- **Belum dikerjakan (opsional, P2)**: route-level code splitting untuk halaman admin (butuh perubahan struktur `App.js`) — sengaja tidak dilakukan agar Fase 1–9 tidak dirombak.

## F. Smoke Verification (manual, tanpa Testing Agent)

| Uji | Hasil |
| --- | --- |
| `yarn build` | ✅ Compiled successfully (+ robots.txt ter-generate) |
| `GET /api/health` | ✅ `status: ok`, `database: connected` |
| Security headers | ✅ nosniff / DENY / referrer / permissions terlihat pada response |
| Auth login (`admin@alsabbat.com`) | ✅ 200, role `SUPER_ADMIN` |
| Rate limit login (MongoDB) | ✅ 401 berulang → **429** setelah melewati batas; dokumen counter ada di collection `rate_limits` dengan TTL |
| CORS produksi wildcard | ✅ startup gagal dengan pesan eksplisit; origin eksplisit → diterima; `docs_url` = None |
| Webhook signature palsu | ✅ ditolak 422 "Signature notifikasi pembayaran tidak valid." |
| Path traversal `/api/media/files/../../.env` | ✅ 404 |
| Endpoint publik | ✅ 200: `/api/matches`, `/api/teams`, `/api/players`, `/api/content/posts`, `/api/gallery/albums`, `/api/merchandise/products`, `/api/merchandise/categories/public` |
| Endpoint terproteksi | ✅ 401 tanpa token / 200 dengan token: `/api/merchandise/orders`, `/api/media/storage/status`, `/api/users` |
| Social publishing existing | ✅ `/api/social/platforms` 401 tanpa token; dengan token mengembalikan status platform (WEBSITE CONNECTED, IG/TikTok/YouTube `NOT_CONFIGURED` — jujur, bukan fake) |
| Halaman publik (screenshot/render) | ✅ `/`, `/matches`, `/merchandise`, `/order`, 404, `/admin/login` — render normal, canonical `https://…` |
| SEO endpoint | ✅ `/api/seo/settings`, `/api/seo/robots.txt`, `/api/seo/sitemap.xml` |

## G. Environment Variables (produksi)

**Railway (backend) — wajib:** `ENVIRONMENT=production`, `MONGODB_URI`, `MONGODB_DB_NAME`,
`JWT_SECRET`, `CORS_ORIGINS` (domain eksplisit), `PUBLIC_SITE_URL`,
`BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`.
**Opsional/hardening:** `ENABLE_API_DOCS=false`, `SECURITY_HEADERS_ENABLED=true`, seluruh `RATE_LIMIT_*`.
**Commerce:** `PAYMENT_PROVIDER=MIDTRANS`, `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`.
**Media:** `MEDIA_STORAGE_PROVIDER=S3` + `S3_*` + `MEDIA_CDN_BASE_URL` (bila memakai object storage).
**Social:** `IG_USER_ID`, `IG_ACCESS_TOKEN`, `TIKTOK_*`, `YOUTUBE_*`.
**Vercel (frontend):** `REACT_APP_BACKEND_URL`, `REACT_APP_PUBLIC_BASE_URL`.
Referensi lengkap: `backend/.env.example`, `frontend/.env.example`, `docs/ENVIRONMENT.md`.

## H. Production Blockers (NOT VERIFIED — bukan bug)

1. **Domain produksi final belum ada** → `PUBLIC_SITE_URL` / `CORS_ORIGINS` / `REACT_APP_*` belum bisa diisi nilai final; canonical & sitemap masih memakai origin preview. Struktur sudah siap diganti tanpa ubah kode.
2. **Midtrans belum ada kredensial** → `PAYMENT_NOT_CONFIGURED`. Alur checkout end-to-end, webhook nyata, dan rekonsiliasi Status API **belum dapat diverifikasi dengan transaksi sungguhan**. Kode mengikuti dokumentasi resmi (Snap `/snap/v1/transactions`, Status `/v2/{order_id}/status`, signature SHA-512).
3. **Kredensial sosial media belum ada** → Instagram/TikTok/YouTube `NOT_CONFIGURED`; publish nyata belum terverifikasi.
4. **MongoDB Atlas belum dibuat** → index/TTL terverifikasi di MongoDB lokal saja.
5. **Konten produksi masih kosong** (sesuai aturan: tanpa data dummy) → SEO sitemap masih minimal dan empty state tampil di seluruh modul.
6. **HTTPS produksi** disediakan platform (Vercel/Railway) — belum bisa diuji tanpa domain.

## I. Remaining Manual Actions (oleh user)

1. Buat MongoDB Atlas cluster + user, isi `MONGODB_URI` di Railway; batasi Network Access.
2. Deploy backend ke Railway (root `backend`), set semua env di bagian G, cek `/api/health`.
3. Deploy frontend ke Vercel (root `frontend`), set `REACT_APP_BACKEND_URL` (+ `REACT_APP_PUBLIC_BASE_URL`), lalu tambahkan domain Vercel ke `CORS_ORIGINS` backend.
4. Setelah domain final: isi `PUBLIC_SITE_URL`, redeploy frontend (robots.txt ter-generate ulang), submit sitemap ke Google Search Console.
5. Midtrans: isi `MIDTRANS_SERVER_KEY`/`MIDTRANS_CLIENT_KEY`, set Payment Notification URL ke `https://<backend>/api/merchandise/payment/webhook`, uji sandbox sebelum `MIDTRANS_IS_PRODUCTION=true`.
6. Rotasi password bootstrap admin setelah login pertama (`/api/auth/change-password`), lalu hapus `BOOTSTRAP_ADMIN_PASSWORD` dari env.
7. Isi konten nyata via Admin Panel (klub, skuad, pertandingan, berita, galeri, produk).
8. Kredensial sosial media bila ingin mengaktifkan publishing.

---

**STOP GATE 10** — tidak ada deploy produksi dan tidak ada perubahan kredensial produksi yang dilakukan.
