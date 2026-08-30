# AUDIT Kartu Pertandingan — 30 Jun 2026 (TANPA perubahan kode)

Trace nyata: UI → state → PATCH /api/matches/{id} → MongoDB → GET (list, detail, relations) → renderer.
Data uji (1 tim + 1 match) dibuat lalu dihapus; DB kembali kosong.

## 1. ROOT CAUSE UTAMA
**Renderer memilih SET FIELD berdasarkan `kind`, sedangkan admin selalu mengedit tab "Kartu Pertandingan" (`card_*`).**
`MatchScoreCardGenerator.js:255-270`:
- `kind='auto'` (dipakai halaman publik `MatchDetailPage.js:201`) → jika skor sudah ada, `cardKind='result'`.
- Mode result HANYA membaca `result_card_<ratio>_background` per match; kalau kosong → **global**
  (`match.card.result_*_background_url` → fallback `match.card.*_background_url`).
→ Background per-match yang diisi di tab "Kartu Pertandingan" **tidak pernah dipakai** setelah skor diisi
  = gejala "background yang dipilih pada Match kembali ke background Global" (J).
Tabel admin juga selalu membuka dialog dengan `cardKind='fixture'` (`AdminMatchesPage.js:132`), jadi admin
mengira sedang mengatur kartu yang dilihat publik.

## 2. ROOT CAUSE TAMBAHAN
1. **CORS berkas media** (M): `loadImage` mencoba `crossOrigin='anonymous'` lalu fallback `fetch(mode:'cors')`
   (`MatchScoreCardGenerator.js:54-92`). Sebelum perbaikan hari ini, `/api/media/files/...` di staging tidak
   mengirim `Access-Control-Allow-Origin` → **kedua jalur gagal → gambar = null tanpa error terlihat** →
   renderer jatuh ke MODE DEFAULT (foto pertandingan + warna klub) = terlihat seperti "kembali ke Global"
   dan "preview kosong setelah pilih Media Library" (J, L, G, H). Perbaikan backend sudah dibuat
   (`media.py::_file_headers`) **tetapi belum di-deploy ke aaPanel** → gejala masih ada di staging.
   Efek samping: bila gambar sempat termuat tanpa CORS, `canvas.toBlob()` gagal (canvas tainted) → unduh gagal.
2. **Dua tombol simpan dengan cakupan berbeda di Desain Kartu Global** (K):
   `MatchCardDesign.js` — tombol besar "Simpan Desain" (`persist`, baris 80-100) **hanya menyimpan
   transparansi**; background + overlay + **zoom logo** hanya tersimpan oleh tombol lain
   "Simpan Background & Overlay" (`persistDesign`, baris 102-123). Menggeser slider "Zoom logo" lalu menekan
   "Simpan Desain" → nilai hilang saat refresh (kembali 100).
3. **Efek zoom logo memang dibatasi** (K): `drawCrest` (baris 129-137) mengunci zoom 60–130% dan menahan skala
   dengan `safe = size*0.96` di atas `base = size*0.68` → perubahan maksimum hanya ~+30%, sering terasa "tidak
   berpengaruh/hilang".
4. **Overlay global selalu menimpa background custom** (I): baris 416-419 menerapkan overlay pada KEDUA mode,
   default `overlayEnabled=true`, `overlayOpacity=55%`, warna navy → background pilihan admin tampak jauh
   berbeda dari gambar aslinya (dianggap "diganti Global").
5. **Preview Desain Global tidak mewakili kartu mana pun** (F): `MatchCardDesign.js:50` mengambil
   `/matches?limit=1` (match pertama, bukan match yang diedit) dan preview memakai `designOverride` (nilai
   belum tersimpan) + `card_*` match tersebut → beda dari hasil akhir.
6. **Beda `kind` antara preview admin dan hasil akhir publik** (F): dialog admin memakai `kind` eksplisit
   (fixture/result) sementara publik memakai `kind='auto'`.
7. **Zoom/focus background per-match tidak berlaku pada mode default**: `bgFocusX/Y` & `bgZoom` hanya dipakai
   di cabang `customBgImg` (baris 348-356). Kalau gambar gagal dimuat (poin 1), slider terasa "tidak berfungsi".
8. **MediaPicker langsung membuka ImageCropper** setelah memilih dari Library saat `spec.aspect` ada
   (`MediaPicker.js:303-311`). Bila cropper gagal memuat (CORS) dan admin menutupnya, nilai URL tetap terpasang
   → admin menyangka "tersimpan tapi preview kosong".

## 3. FILE YANG TERLIBAT
- `frontend/src/pages/admin/AdminMatchesPage.js` (dialog per-match, `cardKind`, events/players untuk scorer)
- `frontend/src/components/admin/MatchCardSettings.js` (per-match `card_*` / `result_card_*`, PATCH)
- `frontend/src/components/admin/MatchCardDesign.js` (global site_content, 2 tombol simpan, preview)
- `frontend/src/components/public/matchcenter/MatchScoreCardGenerator.js` (renderer canvas, prioritas background,
  overlay, sponsor, logo, scorer)
- `frontend/src/lib/matchCardDesign.js` (key site_content + clamp + hook global)
- `frontend/src/components/shared/MediaPicker.js`, `components/shared/ImageCropper.js`,
  `components/public/gallery/mediaUtils.js` (resolveMediaUrl)
- `frontend/src/components/admin/ResourceManager.js` (form match; payload hanya dari `fields` → `card_*` aman)
- `frontend/src/components/admin/MatchResultDialog.js` (PATCH hanya `home_score/away_score/status`)
- `backend/app/models/domain.py` (MatchBase `card_*` + `result_card_*`), `backend/app/api/routes/matches.py`,
  `backend/app/api/routes/media.py`

## 4. DATA/FIELD: HASIL VERIFIKASI NYATA
| Pemeriksaan | Hasil |
| --- | --- |
| PATCH `card_*` → tersimpan? | **YA** (8 field kembali persis: bg feed/story, focus x/y, zoom) |
| GET detail / list / `relations` mengembalikan `card_*`? | **YA, ketiganya** (tidak ada field yang hilang di response) |
| `card_*` vs `result_card_*` tertukar? | **TIDAK** — PATCH `card_*` tidak menyentuh `result_card_*` (tetap `null`) |
| `opponent.logo` tersimpan & dikirim ke renderer? | **YA** (`opponent.logo` ada di list/detail/relations; renderer `loadImage(match.opponent.logo)` baris 334) |
| Sponsor nyata atau placeholder? | **NYATA** — `GET /api/sponsors?status=ACTIVE` (200 publik), hanya sponsor **ber-logo** yang digambar; sponsor tanpa logo dilewati tanpa notifikasi |
| Overlay/gradient/opacity masuk renderer? | **YA** (baris 416-419), tetapi **hanya dari nilai GLOBAL** (site_content), bukan per-match |
| Edit baris Match (ResourceManager) merusak `card_*`? | **TIDAK** — payload dibangun hanya dari daftar `fields` |
| Simpan Hasil Pertandingan merusak `card_*`? | **TIDAK** — hanya `home_score`, `away_score`, `status` |
| State/key yang masih Global (D) | transparansi, overlay on/off + warna + opacity, **zoom logo**, sponsor, dan background default Feed/Story/Result — semuanya global by design; per-match hanya background + focus X/Y + zoom background |

## 5. PERBAIKAN MINIMAL YANG DIREKOMENDASIKAN (belum dikerjakan)
P0
1. **Deploy backend** berisi `_file_headers()` (ACAO pada `/api/media/files/*`) ke aaPanel — tanpa ini semua
   gejala visual tetap muncul walau logikanya benar.
2. **Fallback background per-match lintas jenis kartu**: pada mode result, jika `result_card_*` kosong, pakai
   `card_*` **milik match yang sama** sebelum jatuh ke global (1 baris di `MatchScoreCardGenerator.js:264-270`).
3. **Satukan tombol simpan di Desain Kartu Global** (atau ubah `persist` agar sekaligus menyimpan overlay +
   zoom logo) supaya zoom logo tidak hilang.
P1
4. Dialog per-match: buka tab yang sesuai data (`result` bila skor sudah ada) + label kecil "kartu ini yang
   dipakai halaman publik".
5. `MatchCardDesign`: gunakan match yang sedang dibuka (prop) untuk preview, atau matikan pembacaan `card_*`
   match di preview global agar preview murni global.
6. Naikkan batas `LOGO_ZOOM_MAX`/`base` di `drawCrest` bila zoom logo memang perlu lebih terasa.
7. Tampilkan peringatan di renderer bila `loadImage` mengembalikan null (gambar gagal dimuat) supaya tidak
   "diam-diam" jatuh ke mode default.

## 6. RISIKO TERHADAP KARTU HASIL
- Rekomendasi #2 mengubah **urutan fallback** kartu hasil: kartu hasil yang sekarang sengaja memakai
  background global akan berubah memakai `card_*` match tersebut bila ada. Perlu keputusan user.
- Rekomendasi #3 hanya menyentuh penyimpanan site_content global (dipakai kedua kartu) — tidak mengubah
  `result_card_*` per match.
- Daftar pencetak gol (Match Events) tidak tersentuh oleh rekomendasi mana pun.

## 7. RISIKO TERHADAP FITUR LAIN
- #1 (deploy) sudah teruji: header hanya ditambah pada endpoint berkas media; tidak mengubah auth/RBAC/schema.
- #3 menulis key site_content yang sama dengan sekarang → aman untuk halaman publik lain.
- #5/#6 murni tampilan admin/kartu; tidak menyentuh Match, Match Events, Staff, Pemain, Banner, Media Storage.
- Risiko utama justru bila mengubah `MediaPicker`/`ImageCropper`: dipakai SELURUH modul (banner, pemain, staff,
  galeri, produk) → hindari, semua gejala kartu bisa diselesaikan tanpa menyentuhnya.
