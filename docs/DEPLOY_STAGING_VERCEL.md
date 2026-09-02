# Deploy STAGING ke Vercel (branch `staging`)

Dokumen langkah dashboard untuk Fase 4. **Tidak ada nilai secret di dokumen ini** — hanya nama variable.
Deploy dilakukan oleh pemilik akun (agent tidak bisa push/deploy).

## 0. Prasyarat
- MongoDB Atlas: cluster/database **staging** BARU dan KOSONG (mis. database `alsabbat_platform_staging`),
  user DB khusus staging, Network Access `0.0.0.0/0` (Vercel serverless tidak punya IP tetap).
- Cloudinary: akun/environment staging, folder `alsabbat/staging`.
- Repo GitHub berisi branch `staging`.

## 1. Push ke GitHub branch `staging`
Di chat Emergent: tombol **Save to Github** → pilih/buat branch **`staging`** → **PUSH TO GITHUB**.
`.env` tidak ikut terkirim (sudah di `.gitignore`) — environment variable diisi di Vercel.

## 2. Buat project Vercel
1. vercel.com → **Add New → Project** → import repository.
2. **Production Branch** = `staging` (Settings → Git). Domain kustom TIDAK dipasang di fase ini;
   pakai URL `*.vercel.app` bawaan Vercel.
3. **Settings → Build and Deployment → Framework Preset = `Services`** (WAJIB; tanpa ini blok
   `services` di `vercel.json` diabaikan). Services masih status Beta.
4. Root Directory dibiarkan di root repo (bukan `frontend/`), karena `vercel.json` root yang mengatur
   kedua service.

Isi `vercel.json` (sudah ada di repo):
- service `web` → root `frontend/`, framework `create-react-app`, build `yarn build`, output `build`,
  SPA rewrite ke `/index.html`
- service `api` → root `backend/`, framework `fastapi`, entrypoint `app.main:app`
- rewrites: `/api/(.*)` → service `api`, `/(.*)` → service `web`

## 3. Environment Variables (Settings → Environment Variables)
Isi untuk environment yang dipakai branch `staging`. **Nama variable saja:**

Database: `ENVIRONMENT` (=`staging`), `MONGODB_URI`, `MONGODB_DB_NAME`
Auth: `JWT_SECRET`
Bootstrap admin: `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME`
CORS: `CORS_ORIGINS` (URL deployment staging, tanpa `*`)
Media: `MEDIA_STORAGE_PROVIDER` (=`CLOUDINARY`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, `CLOUDINARY_FOLDER` (=`alsabbat/staging`), opsional `CLOUDINARY_UPLOAD_PRESET`
Frontend: `REACT_APP_BACKEND_URL` (URL deployment staging — frontend & API satu domain),
`REACT_APP_PUBLIC_BASE_URL` (URL deployment staging)
Opsional: `SMTP2GO_API_KEY`, `SMTP2GO_SENDER_EMAIL`, `SMTP2GO_SENDER_NAME`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `GOOGLE_DRIVE_API_KEY`,
`MONGODB_MAX_POOL_SIZE`, `MONGODB_MIN_POOL_SIZE`, `STARTUP_TASKS_MIN_INTERVAL_MINUTES`, `LOG_LEVEL`

Catatan: `CORS_ORIGINS` dan `REACT_APP_*` baru bisa diisi setelah URL deployment diketahui →
isi sementara, deploy, lalu perbaiki nilainya dan **Redeploy**.

## 4. Deploy & verifikasi
1. Deploy dari branch `staging`.
2. `GET https://<deployment>.vercel.app/api/health` → harus `{"status":"ok", "database":"connected",
   "environment":"staging"}`. Bila `degraded`/gagal start, cek Runtime Logs:
   - "Konfigurasi database tidak aman…" → `MONGODB_URI`/`MONGODB_DB_NAME` salah (localhost/kosong/nama DB tertukar)
   - "CORS_ORIGINS wajib…" → `CORS_ORIGINS` masih wildcard/kosong
   - "MEDIA_STORAGE_PROVIDER=CLOUDINARY … kredensial belum lengkap" → variable Cloudinary kurang
3. Buka `/` (frontend) dan `/admin/login` → login memakai `BOOTSTRAP_ADMIN_EMAIL` +
   `BOOTSTRAP_ADMIN_PASSWORD` (admin dibuat otomatis saat database kosong).
4. Media: Admin → Media → status harus `Provider: CLOUDINARY`. Uji satu foto kecil lewat form Pemain
   (MediaPicker memakai signed upload langsung ke Cloudinary); URL hasil harus
   `https://res.cloudinary.com/...` di folder `alsabbat/staging`. Hapus media uji setelah verifikasi.

## 5. Yang TIDAK dilakukan di fase ini
Tidak ada migrasi/dump/restore database lama, tidak memindahkan media lama, tidak menghubungkan
`alsabbat.com`, tidak deploy production.
