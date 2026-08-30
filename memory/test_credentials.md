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
- **FASE 3 (29 Agu 2026)**: pendaftaran sekarang butuh **OTP email**. Karena `SMTP2GO_API_KEY` belum
  diisi, email tidak terkirim; kode OTP hanya bisa dibaca dari log server:
  `grep "otp.debug_code" /var/log/supervisor/backend.out.log | tail -1`
  (log ini hanya aktif di environment non-produksi).
- Alur uji manual: POST `/api/baraya/register` → ambil kode dari log → POST `/api/baraya/otp/verify`
  → dapat `access_token` (peran awal MEMBER). Galeri/Sorotan Pemain akan 403 sampai peran naik
  menjadi PEMAIN/STAFF lewat Admin → Baraya AL SABBAT → Pengajuan.
- Akun uji Fase 3 (`fase3.e2e@sandbox-alsabbat.dev`) SUDAH DIHAPUS beserta sesi, pengajuan, OTP,
  dan counter nomor member direset.
- Untuk pengujian, buat akun sandbox lewat /daftar atau pakai skrip sandbox
  (`/app/scripts/phase3_verify.py`, `phase17_verify.py`, `phase18_verify.py`) yang memakai database
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

## Update — role admin baru (30 Jun 2026)
- Akun `admin@alsabbat.com` / `Alsabbat2026!` tetap `SUPER_ADMIN` (full access, diverifikasi ulang).
- Role yang bisa dipilih saat membuat akun admin: SUPER_ADMIN, CLUB_ADMIN, PLAYER_STAFF_ADMIN, MATCH_ADMIN,
  MEDIA_CONTENT_ADMIN, STORE_MANAGER, FINANCE_ADMIN, IT_ADMIN. Role lama (CONTENT_ADMIN, GALLERY_ADMIN,
  SOCIAL_MEDIA_ADMIN, STORE_ADMIN, ORDER_ADMIN) masih valid di backend tapi disembunyikan dari dropdown.
- Akun uji role baru dibuat sementara oleh `scripts/rbac_roles_verify.py` (pola
  `uji.<role>@sandbox-alsabbat.dev` / `RbacUji2026!`) dan SELALU dihapus di akhir skrip.
  Database saat ini hanya berisi 1 akun admin (super admin di atas).

## Update — validasi pengajuan Pemain (30 Agu 2026)
- Akun uji `uji.pemain@sandbox-alsabbat.dev` / `Sandbox123` SUDAH DIHAPUS beserta pengajuan, sesi, pemain uji,
  tim/klub uji, dan berkas media uji. Database preview kembali bersih (players/teams/media/customers = 0).
- Admin tetap `admin@alsabbat.com` / `Alsabbat2026!` (SUPER_ADMIN). Catatan: saat pembersihan data uji, koleksi
  `sessions`/`customer_sessions` dikosongkan → sesi login lama perlu login ulang (tidak ada data konten yang hilang).
