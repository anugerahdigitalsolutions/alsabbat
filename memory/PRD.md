# AL SABBAT FOOTBALL CLUB — PRD / Status

## Problem statement (ringkas)
Platform klub sepak bola: Web (React), Mobile (React Native/Expo SDK 57), Backend (FastAPI + MongoDB).
Fitur: Auth/Baraya, Member, Player, Teams, Matches, News, Gallery (media lokal + Google Drive),
Notifications, Merchandise lengkap (katalog, varian, cart, checkout, order, tracking, refund).

## Arsitektur
```
/app/backend    FastAPI + MongoDB (gallery Drive: app/services/drive.py)
/app/frontend   React web + admin
/app/mobile     Expo/React Native (SDK 57)
/app/scripts    script verifikasi logika
```

## Implemented (ringkas)
- Sinkronisasi fitur Web → Mobile (auth, member, squad, matches, news, gallery, notifikasi, merchandise).
- Fix upload foto mobile (FormData tanpa Content-Type paksa).
- Countdown pertandingan, app icon gradient, Merchandise final + Product Variants.
- **09 Jun 2026 — Fix Mobile Google Drive Gallery**
  - Root cause: gating `album.data?.drive_folder_id` (field tidak ada) → request `/drive-photos`
    tidak pernah jalan di mobile. Diganti `drive_folder_url`.
  - URL Drive dinormalisasi ke direct-image `lh3.googleusercontent.com/d/<id>=w<size>` +
    rantai fallback (`mobile/src/lib/driveImage.js`, `components/RemoteImage.js`).
- **09 Jun 2026 — 3 fitur Gallery mobile (mobile-only)**
  1. **Simpan Foto**: `mobile/src/lib/photoActions.js` — unduh ke cache (`expo-file-system`),
     izin write-only (`expo-media-library`), `MediaLibrary.Asset.create`, validasi ukuran file.
  2. **Navigasi Subfolder Drive**: `mobile/src/components/DriveFolderBrowser.js` memakai endpoint
     existing `/gallery/public/albums/{id}/drive-browse` (sama dengan web), 1 batch = 30 item,
     breadcrumb + tombol kembali, folder/foto terpisah, loading/empty/error state.
  3. **Bagikan Foto**: `expo-sharing` share sheet native (WhatsApp muncul bila terpasang),
     membagikan FILE foto, tanpa integrasi/credential WhatsApp.
  - Dependency baru: `expo-media-library`, `expo-sharing`, `expo-file-system` (+ plugin di app.config.js).
  - Verifikasi: `scripts/mobile_gallery_features_verify.py` (34/34 PASS),
    `scripts/mobile_drive_gallery_verify.py` (13/13 PASS), eslint clean,
    `expo export` Android + iOS sukses.
  - Backend, website, DB, credential Drive TIDAK diubah. Perlu rebuild mobile (Build 5).

- **09 Jun 2026 — UI parity Android → iOS (styling saja, iOS = referensi)**
  - Penyebab utama beda render: (1) Android `includeFontPadding` menambah tinggi/offset teks,
    (2) `elevation` menggambar shadow dengan outline KOTAK pada view rounded/transparan
    (tombol pill tampak seperti kotak), (3) font scaling sistem Android, (4) animasi tab `shift`.
  - File: `mobile/src/theme/index.js` (token `androidTextFix` + elevation gold 0 di Android),
    `components/Txt.js`, `components/Field.js`, `components/Buttons.js`,
    `navigation/TabNavigator.js`, `components/MatchCard.js`,
    `screens/MemberCardScreen.js`, `screens/MatchDetailScreen.js`.
  - iOS: properti shadow/radius/tipografi iOS tidak diubah sama sekali.
  - Verifikasi: `scripts/mobile_ui_parity_verify.py` (19/19 PASS), eslint 0 error,
    `expo export` Android + iOS sukses. Perlu rebuild mobile.

- **09 Jun 2026 — Batch 7 poin mobile (UI + push)**
  1. Banner Home: teks pindah ke bawah, gradient bawah 58%, headline `h2` (BannerCarousel.js)
  2. Shortcut "Notifikasi" dihapus dari grid Home (HomeScreen.js) — sistem notifikasi tetap utuh
  3. Blok waktu kartu pertandingan digeser turun (MatchCard.js `paddingTop 40`)
  4. "Buka Toko" → "Kunjungi Toko" (Home/Cart/Checkout/Orders)
  5. Badge media album = media lokal + `total` dari `/drive-photos` (AlbumDetailScreen.js)
  6. Latar Kartu Member mengikuti web: site content `member.card.background_url` + overlay
     gradient identik, fallback pola garis + kilau emas (MemberCardScreen.js)
  7. Push: channel Android 'default' dibuat saat app start (importance MAX), retry registrasi
     token saat app aktif, logging dev tersamar, `GOOGLE_SERVICES_JSON` opsional di app.config.js;
     backend menambah logging alasan penolakan Expo (`push.py`, `broadcast.py`)
  - Verifikasi: `scripts/mobile_batch_improvements_verify.py` 40/40 PASS, eslint 0 error,
    `expo export` Android+iOS sukses, testing_agent backend 13/13 PASS
    (`test_reports/iteration_1.json`, `backend/tests/test_push_broadcast_gallery.py`).
  - **Butuh konfigurasi eksternal**: kredensial FCM Android (google-services.json + FCM V1
    service account di EAS) dan APNs key iOS — tanpa itu push tidak akan sampai ke device.

## Backlog
- P1: Uji device iOS + Android untuk izin galeri, share sheet, dan navigasi subfolder Drive nyata.
- P1: Uji visual berdampingan iOS vs Android setelah rebuild (tombol, input, kartu, tab bar).
- P2: Simpan seluruh folder (batch download) — belum ada.
- P2: Deep-link foto Drive dari web ke mobile.

## Catatan penting
- Git write (commit/push) TIDAK dilakukan agent; user pakai fitur "Save to Github" atau arsip tar.gz.
- Gallery hanya untuk role PEMAIN/STAFF (403 untuk publik) — normal.
- Preview DB tidak punya album Drive dan `GOOGLE_DRIVE_API_KEY` tidak di-set → uji e2e Drive hanya di production/device.
- Arsip source terbaru: `frontend/public/alsabbat-mobile-batch-improvements-source.tar.gz` (tanpa `.git`, 12 MB).
