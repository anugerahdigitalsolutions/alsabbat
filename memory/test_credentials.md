# Test Credentials — ALSABBAT

## Admin Panel (RBAC) — /admin/login
- Super Admin: admin@alsabbat.com / Alsabbat2026!

## Baraya (customer) — /login
- Tidak ada akun Baraya di database produksi (sengaja bersih, tanpa data uji).
- Untuk pengujian, buat akun sandbox lewat /daftar atau gunakan skrip sandbox
  (`/app/scripts/phase17_verify.py`) yang memakai database sekali-pakai lalu di-DROP.
- Pola akun sandbox: <nama>@sandbox-alsabbat.dev / Sandbox123
  (domain .test/.example ditolak validator email).

## Catatan
- Jangan menyeed data uji ke database produksi.
- Testing Agent DILARANG oleh user; verifikasi memakai skrip Python + curl + screenshot.
