# Test Credentials — ALSABBAT

## Admin Panel (RBAC) — buka /admin/login (BUKAN /login)
- Email    : admin@alsabbat.com
- Password : Alsabbat2026!
- Role     : SUPER_ADMIN · is_active: true
- Sumber   : `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` di `/app/backend/.env`
- Catatan  : password **case-sensitive** dan tanda seru (!) di akhir wajib ikut.
  Diverifikasi 26 Jun 2026: `POST /api/auth/login` → 200 dan login UI `/admin/login` masuk ke dashboard.
  Password TIDAK direset (hash existing cocok dengan nilai konfigurasi).

## Beda dua form login (penyebab umum "Invalid email or password")
- `/admin/login`  → khusus staf/admin (RBAC). Pesan gagal berbahasa Inggris: "Invalid email or password".
- `/login`        → khusus Baraya ALSABBAT (customer). Pesan gagal berbahasa Indonesia:
                    "Email atau kata sandi tidak sesuai."
  Akun admin TIDAK bisa login di `/login`, dan akun Baraya TIDAK bisa login di `/admin/login`.
- Rate limit login aktif: bila terlalu sering gagal, respons berubah menjadi 429 (bukan 401).
  Tunggu sebentar lalu coba lagi.

## Baraya (customer) — /login
- Tidak ada akun Baraya di database produksi (sengaja bersih, tanpa data uji).
- Untuk pengujian, buat akun sandbox lewat /daftar atau pakai skrip sandbox
  (`/app/scripts/phase17_verify.py`, `/app/scripts/phase18_verify.py`) yang memakai database
  sekali-pakai lalu di-DROP.
- Pola akun sandbox: <nama>@sandbox-alsabbat.dev / Sandbox123
  (domain .test/.example ditolak validator email).

## Catatan
- Jangan menyeed data uji ke database produksi.
- Testing Agent DILARANG oleh user; verifikasi memakai skrip Python + curl + screenshot.

## Update — konfigurasi staging aaPanel (Agustus 2026)
Environment preview/staging sekarang diselaraskan dengan deployment aaPanel staging:

| Setelan | Nilai staging |
| --- | --- |
| `ENVIRONMENT` | `staging` |
| `MONGODB_DB_NAME` | `alsabbat_platform_staging` |
| `MEDIA_STORAGE_PROVIDER` | `LOCAL` |
| `MEDIA_LOCAL_PERSISTENT` | `false` di container preview, `true` di server aaPanel |

- Akun admin di atas (`admin@alsabbat.com` / `Alsabbat2026!`) **tetap valid** dan sudah
  diverifikasi ulang pada database `alsabbat_platform_staging`:
  `POST /api/auth/login` → 200 dan login UI `/admin/login` masuk ke dashboard.
- Database lama `alsabbat_platform` di container TIDAK dihapus (dibiarkan utuh sebagai
  cadangan). Database aaPanel tidak disentuh sama sekali.
- Verifikasi konfigurasi menyeluruh (33 pemeriksaan, bersih tanpa sisa data uji):
  `python scripts/staging_config_verify.py [base_url]`
- Skrip verifikasi mengunggah satu berkas uji lalu menghapusnya sendiri (hard delete),
  jadi aman dijalankan terhadap `https://api-staging.alsabbat.com`.
