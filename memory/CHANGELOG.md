# CHANGELOG — ALSABBAT (lanjutan dari PRD.md)

PRD.md sudah >700 baris; riwayat implementasi baru dicatat di sini. Semua pekerjaan di bawah
dilakukan **hanya di codebase development/staging**. Tidak ada perubahan produksi, tidak ada
migrasi, tidak ada data dummy permanen (semua fixture verifikasi memakai database sandbox
sekali-pakai yang di-DROP di akhir skrip).

## [8 Sep 2026] Merchandise Fase 2 — Ongkir real-time RajaOngkir
- `GET /api/merchandise/shipping/destinations?q=`, `POST /api/merchandise/shipping/quote`,
  dan checkout server-side (`POST /api/merchandise/checkout`) memakai
  `app/services/shipping_rajaongkir.py` (Shipping Cost API).
- Kredensial (`RAJAONGKIR_COST_API_KEY`, `SHIPPING_ORIGIN_DESTINATION_ID`) hanya dari
  Integration Settings terenkripsi / env — write-only, tidak pernah dikirim ke frontend.
- Order menyimpan snapshot pengiriman (tujuan, kurir, layanan, ongkir, berat) saat pesanan dibuat.
- Verifikasi: `scripts/merch_phase2_verify.py` → **29/29 PASS**. Di staging kredensial RajaOngkir
  BELUM ada, jadi UI checkout menampilkan status jujur `SHIPPING_NOT_CONFIGURED`
  (tanpa kurir/harga palsu).

## [8 Sep 2026] Merchandise Fase 3 — Admin Order Management
- Lifecycle server-side: `PENDING → PROCESSING → PACKED → READY_TO_SHIP → SHIPPED → COMPLETED`
  (+ pembatalan), guard transisi, update status atomik, `timeline[]` immutable, `fulfilment{}` (AWB).
- `app/services/order_fulfilment.py` (baru), Admin Orders list/detail/aksi
  (`frontend/src/pages/admin/AdminOrdersPage.js`), `components/shared/OrderTimeline.js`,
  timeline pelanggan di halaman order Baraya + tracking publik.
- Notifikasi memakai infrastruktur `notifications` existing (tidak ada sistem notifikasi baru).
- Verifikasi: `scripts/merch_phase3_verify.py` → **48/48 PASS**, regresi Fase 2 tetap 29/29.

## [8 Sep 2026] Merchandise Fase 4–7 — COD, Delivery Pelanggan, Refund, Hardening, Laporan Penjualan
Semua diverifikasi lewat `scripts/merch_phase4_7_verify.py` → **69/69 PASS** (database sandbox
`alsabbat_merch_p47_sandbox`, di-DROP di akhir) + verifikasi UI Playwright pada database visual
sandbox `alsabbat_merch_p3_visual` (juga sudah di-DROP; staging kembali kosong: orders/products/
refunds/customers/notifications = 0).

### Fase 4 — COD
- Ketersediaan COD **hanya** dari kapabilitas penyedia pada hasil quote (field `cod_available`
  + `cod_fee` per layanan). Tidak ada whitelist kurir/hardcode.
- `GET /api/merchandise/cod/status` mengembalikan status jujur `COD_NOT_CONFIGURED` bila kredensial
  Delivery/COD belum ada (tanpa membocorkan rahasia).
- Checkout COD: total dihitung ulang di server (subtotal + ongkir + biaya COD), validasi 422 bila
  tujuan/layanan tidak dipilih atau layanan tidak mendukung COD; order tercatat
  `payment_method_choice=COD`, `payment_status=PENDING`.
- `POST /api/merchandise/orders/{id}/cod-shipment` membuat pengiriman COD **hanya** via API
  RajaOngkir/Komerce sesungguhnya. Tanpa kredensial → error jujur, tidak ada AWB palsu.
- **STATUS: BLOCKED / NOT VERIFIED (end-to-end)** — kredensial RajaOngkir/Komerce Delivery tidak
  tersedia di environment ini, jadi quote COD nyata, biaya COD nyata, dan pembuatan AWB COD nyata
  belum pernah diuji terhadap API asli. Yang terverifikasi: logika filter/fee dari payload
  penyedia (stub di sandbox), validasi, dan perilaku not-configured.

### Fase 5 — Delivery pelanggan
- `POST /api/baraya/orders/{id}/receive` (konfirmasi terima, sekali saja → COMPLETED),
  `POST /api/baraya/orders/{id}/reject` (alasan + detail wajib), `POST /api/baraya/orders/{id}/evidence`
  (upload bukti foto memakai Media Library existing; hanya pemilik order).
- UI: `pages/public/BarayaOrderDetailPage.js` — kartu AKSI (Barang Diterima / Tolak Barang /
  Ajukan Refund), form alasan+detail+bukti, kartu status refund, progres timeline.
- Terverifikasi di browser: receive → status Selesai; reject + 1 bukti terunggah (HTTP 200) →
  status REJECTED + timeline "Barang ditolak pembeli".
- Bug yang ditemukan & diperbaiki: `barayaApi` selalu mengirim `Content-Type: application/json`
  sehingga upload multipart gagal 422. Interceptor `barayaApi` sekarang menghapus header itu untuk
  `FormData` (sama seperti client admin `api`).

### Fase 6 — Refund
- Koleksi `refunds` + `app/services/refunds.py`: status `REQUESTED → UNDER_REVIEW → APPROVED/REJECTED
  → PROCESSING → COMPLETED/FAILED`, timeline audit, satu refund aktif per order (duplikat ditolak).
- Pelanggan: `POST /api/baraya/orders/{id}/refund`. Admin: review (approve/reject), proses, dan
  pencatatan transfer manual untuk `COD_MANUAL` (`/api/merchandise/refunds...`).
- Refund Midtrans memakai **API refund resmi Midtrans**; tanpa kredensial → status jujur, tidak
  pernah menandai refund berhasil tanpa konfirmasi provider. **Refund Midtrans nyata: BLOCKED /
  NOT VERIFIED** (kredensial tidak tersedia).
- Terverifikasi di browser (COD_MANUAL): Diajukan → Setujui → Proses → catat referensi transfer →
  Selesai, order menjadi final REFUNDED.

### Fase 7 — Commerce hardening
- `app/services/commerce_stock.py`: pengurangan stok atomik (`$inc` bersyarat) — checkout
  bersamaan tidak bisa membuat stok minus; restock idempoten (flag `stock_applied`) sehingga
  cancel/expire/refund tidak menambah stok dua kali.
- Kedaluwarsa pembayaran disimpan server-side (`payment_expires_at`) dan dievaluasi di server.
- Webhook pembayaran: signature diverifikasi (payload palsu → 422), setiap event dicatat di
  `payment_webhook_logs` dengan `event_key` unik → replay event yang sama tidak memproses ulang.
- Guard transisi + jejak audit `timeline[]` untuk semua aksi admin/pelanggan/sistem; RBAC &
  kepemilikan order diuji (pelanggan lain → 403/404).

### Fase 7B — Laporan penjualan
- `app/api/routes/sales_reports.py` (agregasi MongoDB, zona waktu Asia/Jakarta):
  ringkasan (gross/net sales, ongkir, biaya COD, total refund, order terhitung, item terjual),
  tren harian/bulanan, breakdown produk/varian, kategori, metode pembayaran, status order,
  pengiriman, dan refund + `GET /api/reports/sales/export.csv`.
- UI: `pages/admin/AdminSalesReportPage.js` (menu "Sales Report" di AdminSidebar), filter periode
  (hari ini/7h/30h/bulan ini/kustom), granularitas, chart Recharts warna klub, ekspor CSV,
  definisi metrik tertulis. Angka dihitung di server, bukan di klien.
- Verifikasi UI: desktop 1920px tanpa overflow, mobile 390px OK setelah tabel dibungkus
  `min-w-0 + overflow-x-auto`, console error kosong.

### Catatan verifikasi lain
- Regresi: Fase 2 `29/29`, Fase 3 `48/48`, Fase 4–7 `69/69` — semua PASS setelah perubahan.
- `yarn build` sukses (hanya warning lama). `ruff check --select E9,F` bersih untuk semua file
  yang disentuh (sisa temuan hanya gaya `UP006/UP045` yang konsisten dengan gaya repo lama).
- Overflow mobile pada header publik (`max-w-[190px]` tombol Baraya) sudah ada sebelum fase ini
  (muncul juga di `/merchandise`) — tidak diubah karena di luar cakupan.
- Testing Agent tidak digunakan (sesuai larangan user).

## [8 Sep 2026] Global Maintenance Mode
- **Storage**: memakai key/value store existing `site_content` (key `maintenance_mode`, group
  `system`, value `{enabled, updated_at, updated_by}`). Tidak ada koleksi/model baru, tidak ada
  migrasi, tidak ada data yang dihapus.
- **Endpoint**: `GET /api/system/maintenance` (publik — hanya `enabled`, `message`, `updated_at`;
  `updated_by` TIDAK diekspos) dan `PUT /api/system/maintenance` (RBAC `system:write`).
- **RBAC**: permission baru `system:write` ditambahkan ke daftar `P` di `app/core/rbac.py`;
  hanya SUPER_ADMIN yang memilikinya (via WILDCARD). Role lain (mis. STORE_MANAGER) → False.
- **Frontend**: `pages/public/MaintenancePage.js` (layar branded biru klub, judul persis
  "SEDANG MAINTENANCE SISTEM"), `lib/maintenance.js` (hook + aksi API; sumber kebenaran backend,
  bukan localStorage), gate di `components/public/PublicLayout.js` (render layar, TANPA redirect →
  tidak ada loop), dan `components/admin/MaintenanceModePanel.js` di halaman Admin → System Status.
- **Behavior**: ON → semua rute publik (desktop & mobile shell) menampilkan layar maintenance;
  rute `/admin/*` tidak melewati PublicLayout sehingga admin tetap bisa login & mematikan mode.
  Endpoint backend TIDAK diblokir (keputusan sadar) agar auth, media, merchandise, order, payment,
  shipping, refund, notifications, dan sales report tetap utuh saat maintenance.
- **Verifikasi**: OFF→normal; PUT tanpa token 401; PUT token non-admin (klaim permission palsu) 401;
  admin ON → publik `/`, `/merchandise`, `/matches`, `/login` semua menampilkan layar maintenance
  tanpa perubahan URL; refresh tetap ON; admin login & `/admin/system` tetap jalan saat ON;
  toggle OFF dari UI → publik normal lagi tanpa redeploy. Desktop 1920px & mobile 390px tanpa
  overflow baru, console error kosong. Regresi Fase 2 `29/29`, Fase 3 `48/48`, Fase 4–7 `69/69`
  PASS; `yarn build` sukses; `ruff --select E9,F` bersih.

## [8 Sep 2026] Redesign UI/UX Admin Panel (visual only)
- **Tidak ada perubahan backend/API/database/RBAC/business logic.** Hanya file frontend + CSS.
- Design system baru discope ke `[data-admin-ui]` di `src/index.css` (radius 20/12px, border navy 10%,
  shadow berlapis, tabel header uppercase navy + hover row, input h-12 + focus ring navy, tombol
  radius 12 + press feedback, dialog radius seragam, kanvas `als-admin-canvas` dengan wash brand).
  Warna tetap brand AL SABBAT (gold #FCCF2B, navy #012891, hitam) — tidak memakai palet referensi.
- `components/admin/AdminShell.js`: header jadi floating glass card (section + judul halaman),
  konten pakai `.als-admin-main` (padding mengikuti `--adm-rail`), sidebar bisa di-collapse
  (UI-only, preferensi di localStorage), semua kontrol lama tetap ada (Lihat Website,
  NotificationBell, menu user, logout, sheet mobile) + `SheetTitle` sr-only agar warning a11y hilang.
- `components/admin/AdminSidebar.js`: panel gelap dengan wash navy/gold, active state pill gold,
  hover halus, mode collapsed (ikon + tooltip). Seluruh 27 item menu, permission, route, urutan,
  dan `data-testid` TIDAK berubah.
- `pages/admin/AdminLoginPage.js`: split two-panel (kiri branding crest + heading, kanan form putih),
  input h-12, tombol pill gold. Logic login/redirect/error/testid persis sama.
- `components/admin/StatCard.js` + `pages/admin/AdminDashboardPage.js`: hero navy dengan tanggal
  hari ini, kartu statistik baru (kartu pertama accent navy), panel System Status & Cakupan tetap
  memakai data `/api/system/status` existing — tanpa data/statistik palsu.
- Halaman lain (Orders, Sales Report, Products, Club, System, Media, Content, dst.) otomatis ikut
  design system baru karena memakai `.als-card`, tabel, input, dan dialog yang di-restyle global.
- **Verifikasi**: login → dashboard → collapse sidebar → Orders (list + dialog) → Sales Report
  (chart + tabel) → Products (dialog form) → Club → System; toggle Maintenance ON/OFF tetap bekerja;
  logout kembali ke `/admin/login`. Sidebar mobile sheet tetap 27 item. Desktop 1920px & mobile 390px
  tanpa horizontal overflow, console error kosong. `yarn build` sukses (hanya warning lama).

## [8 Sep 2026] Mobile (Expo) — sinkronisasi fitur Web/Backend, fix upload foto, countdown
**Hanya folder `/app/mobile` + dokumentasi.** ZERO perubahan backend, database, schema,
RBAC, atau frontend web. Tidak ada endpoint/koleksi baru, tidak ada data dummy,
tidak ada deploy produksi.

### Fitur baru di mobile (memakai API existing)
- **Merchandise lengkap**: `StoreScreen` (katalog + kategori + kartu 4:5),
  `ProductDetailScreen` (galeri campuran foto+video 4:5 lewat `MediaGallery` +
  `expo-video`, zoom foto via ImageViewer existing, varian/ukuran, stok, jumlah),
  `CartContext` (AsyncStorage) + `CartScreen` (revalidasi server, ubah jumlah, hapus),
  `CheckoutScreen` (data pembeli, alamat, pencarian tujuan RajaOngkir, quote ongkir,
  pilih kurir/layanan, biaya COD, total server-side, Midtrans lewat `expo-web-browser`,
  COD hanya bila backend menyatakan tersedia), `OrdersScreen`, `OrderDetailScreen`
  (status, ringkasan, kurir/AWB, timeline, Barang Diterima, Tolak + alasan + detail +
  bukti foto, Ajukan Refund, kartu status refund), `OrderTrackScreen` (guest tracking).
- **Tim**: `TeamsScreen` + `TeamDetailScreen` (skuad & staf per tim).
- **Foto profil akun** di ProfileScreen (`POST/DELETE /api/baraya/me/photo`).
- **Maintenance Mode global**: `lib/maintenance.js` + `MaintenanceScreen`
  ("SEDANG MAINTENANCE SISTEM"), status hanya dari `GET /api/system/maintenance`,
  render langsung tanpa redirect (tidak ada loop), 404/offline → app tetap normal.
- **Countdown pertandingan terdekat**: `lib/countdown.js` + `components/Countdown.js`
  (HARI/JAM/MENIT/DETIK) pada kartu Home, kartu laga terdekat di MatchesScreen, dan
  MatchDetail. Kickoff dari backend, naive timestamp diperlakukan WIB (+07:00),
  1 interval per kartu, cleanup di unmount, re-sync via AppState, tanpa nilai negatif.
- Navigasi: tab **TOKO** (badge jumlah keranjang), quicklink Toko di Home, menu
  Pesanan Saya / Lacak Pesanan / Toko / Tim di Profile (login & tanpa login).

### BUG UPLOAD FOTO PEMAIN — root cause & fix
1. `lib/photoUpload.js` mengirim `headers: { 'Content-Type': 'multipart/form-data' }`.
   Header manual tanpa boundary membuat backend menolak: dibuktikan nyata →
   `HTTP 400 {"detail":"Missing boundary in multipart."}` (skrip verifikasi).
2. Aplikasi mobile menunjuk **API produksi** (`eas.json`/fallback `api.alsabbat.com`)
   yang **belum punya** `POST /api/baraya/uploads/photo` → `HTTP 404` (diverifikasi
   dengan curl read-only ke produksi).
**Fix**: header multipart tidak pernah diset (interceptor `api/client.js` kini memakai
`AxiosHeaders.delete('Content-Type')` yang case-insensitive), MIME + nama berkas
diturunkan dari asset picker, dan upload otomatis mundur ke endpoint existing
`POST /api/baraya/me/upload` bila endpoint baru belum ada di server (404/405).
Verifikasi: `python3 scripts/mobile_photo_upload_verify.py` → **13/13 PASS**
(akun sandbox dibuat lewat OTP lalu DIHAPUS; database kembali 0 di semua koleksi).

### Verifikasi
- `npx eslint src App.js` → **0 error** (hanya warning gaya lama).
- `npx expo export --platform android --no-bytecode` → **bundle sukses** (1478 modul,
  2.9 MB). Langkah `hermesc` gagal hanya karena binari Hermes tidak bisa dieksekusi di
  container ini (batasan environment, bukan kode).
- Audit kontrak API: **69/69** panggilan `api.*` di mobile cocok dengan OpenAPI backend.
- Logika countdown diuji unit (11/11 PASS: parsing WIB, ISO berzona, tanggal invalid,
  breakdown, clamp negatif, started).
- Tidak ada secret provider (Midtrans/RajaOngkir/Resend/Cloudinary/Mongo) di kode mobile.

### BLOCKED (bukan kode mobile)
- Server produksi masih versi lama: `/api/system/maintenance`,
  `/api/merchandise/shipping/*`, `/api/merchandise/cod/status`, dan
  `/api/baraya/uploads/photo` → 404. Fitur terkait tampil sebagai status jujur sampai
  backend baru di-deploy (deploy TIDAK dilakukan sesuai instruksi).
- Ongkir/COD/Midtrans/refund provider tetap **BLOCKED BY CREDENTIALS** (sama seperti web).
- Verifikasi visual di device/emulator belum dilakukan (tidak ada emulator/Expo Go di
  container ini; `react-native-web` tidak dipasang).

## [8 Sep 2026] Mobile — App icon: latar solid navy -> gradasi HITAM ke BIRU (visual only)
Perubahan **hanya app/launcher icon**. Tidak ada perubahan UI/halaman/navbar/splash/
logo in-app/fitur/backend/API/database/navigasi/logic/endpoint/konfigurasi produksi.

- `mobile/assets/icon.png` & `mobile/assets/android-icon-background.png` di-generate
  ulang dari generator existing `mobile/scripts/prepare-native-assets.py` dengan
  `icon_gradient()`: gradasi diagonal `#02050E` (hitam pekat, dominan) → `#012891`
  (biru resmi klub, aksen kanan-bawah), easing per-piksel (power 1.65) supaya halus.
- Logo dipakai apa adanya dari `assets/source/alsabbat-logo.png` (fit 820, center) —
  **tidak di-redraw**. Verifikasi piksel: 286.082 piksel logo opak dibanding icon lama
  → **0 perbedaan**; hanya latar (745.261 piksel) yang berubah.
- `mobile/app.config.js`: satu baris — `android.adaptiveIcon.backgroundColor`
  `#012891` → `#02050E` (fallback launcher agar konsisten dengan latar baru).
  Splash (`splash-icon.png` + `#012891`) dan warna notifikasi TIDAK diubah.
- Asset lain (logo.png, splash-icon.png, favicon.png, monochrome, onboarding) tetap
  byte-identik. Validasi: eslint 0 error, `expo export --platform android` sukses,
  `app.config.js` termuat valid, pratinjau 48/96/192 px + simulasi adaptive bulat jelas.

