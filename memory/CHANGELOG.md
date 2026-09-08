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
