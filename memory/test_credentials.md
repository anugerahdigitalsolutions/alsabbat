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
