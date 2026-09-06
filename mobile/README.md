# AL SABBAT — Aplikasi Mobile Native (Expo / React Native)

Aplikasi **native Android** resmi AL SABBAT Football Club. Bukan PWA, bukan
WebView, bukan wrapper website: seluruh UI dibangun dengan komponen React
Native dan navigasi native (React Navigation).

Aplikasi ini adalah **klien terpisah** yang memakai **backend FastAPI dan
database MongoDB ALSABBAT yang sudah ada**. Tidak ada backend kedua, tidak ada
database kedua, dan tidak ada business logic yang dipindahkan ke mobile.

---

## 1. Arsitektur

```
mobile/                     ← aplikasi Expo (React Native)
  App.js                    ← font Poppins + splash + providers
  app.config.js             ← konfigurasi Expo/Android (icon, splash, package)
  eas.json                  ← profil build EAS (development / preview / production)
  assets/                   ← icon, adaptive icon, splash, logo, onboarding
  scripts/prepare-native-assets.py
                            ← regenerasi asset native dari artwork resmi klub
  src/
    api/                    ← axios client + daftar endpoint API existing
    context/                ← AuthContext (Baraya/customer) & ClubContext
    components/             ← komponen UI native (card, banner, viewer, dll)
    hooks/                  ← useResource (fetch), useGoogleAuth
    lib/                    ← format tanggal ID, util pertandingan, onboarding store
    navigation/             ← RootNavigator (stack) + TabNavigator (bottom nav)
    screens/                ← seluruh layar aplikasi
```

Bottom navigation native: **HOME · MATCH · NEWS · MEDIA · PROFILE**.

Layar lain (stack): Onboarding, Login, Register, OTP, Lupa Sandi, Detail
Pertandingan, Detail Berita, Detail Album + image viewer, Skuad, Detail Pemain,
Notifikasi, Kartu Member, Profil Klub.

### Admin Panel
Admin Panel **tetap aplikasi web yang sudah ada** dan tidak dimasukkan ke
aplikasi mobile. Tidak ada layar, role, atau endpoint admin di aplikasi ini.

### Match Center = READ-ONLY
Layar pertandingan hanya menampilkan informasi (skor, status, event, info laga,
head-to-head, berita terkait). **Tidak ada** pemilihan pemain, lineup editor,
starter/substitute selector, formation editor, maupun tampilan susunan pemain.
`players` dari `/api/matches/{id}/relations` hanya dipakai untuk menampilkan
nama pada event yang sudah dicatat klub.

---

## 2. Data — tanpa mock

Seluruh data dinamis berasal dari API ALSABBAT yang sudah ada:

| Fitur | Endpoint |
| --- | --- |
| Identitas klub | `GET /api/club/active`, `GET /api/site-content/public` |
| Banner Home | `GET /api/banners/public` |
| Pertandingan | `GET /api/matches`, `GET /api/matches/{id}/relations` |
| Berita | `GET /api/content/posts`, `GET /api/content/posts/by-slug/{slug}`, `GET /api/content/categories` |
| Media / galeri | `GET /api/gallery/public/albums`, `.../{id}`, `.../{id}/drive-photos` |
| Skuad & staf | `GET /api/players`, `GET /api/players/{id}`, `GET /api/players/{id}/statistics`, `GET /api/staff` |
| Klub & prestasi | `GET /api/achievements`, `GET /api/sponsors` |
| Auth | `POST /api/baraya/login`, `/register`, `/otp/request`, `/otp/verify`, `/google/login`, `/forgot-password`, `/reset-password-otp`, `/logout` |
| Akun | `GET/PATCH /api/baraya/me`, `GET /api/baraya/member-card`, `GET /api/baraya/notifications` (+ read / read-all / unread-count) |

Bila API kosong, layar menampilkan **empty state** yang jujur — tidak ada
pertandingan, berita, pemain, banner, atau statistik yang di-hardcode.

Galeri hanya terbuka untuk peran **PEMAIN / STAFF** (aturan backend, HTTP 403);
aplikasi menampilkan status “terbatas”, bukan konten palsu.

---

## 3. Konfigurasi environment

Base URL API **tidak pernah di-hardcode**. Nilainya dibaca dari
`EXPO_PUBLIC_API_URL` dan diteruskan ke runtime lewat `expo.extra.apiUrl`.

```bash
cp .env.example .env       # lalu sesuaikan
```

| Variabel | Fungsi |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Base URL backend FastAPI (tanpa `/api`) |
| `EXPO_PUBLIC_APP_ENV` | `development` / `preview` / `production` |
| `EXPO_PUBLIC_WEB_URL` | Domain website resmi (untuk redirect Google) |
| `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` | Opsional, default `‹web url›/auth/google` |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Opsional; default memakai `google_client_id` dari `/api/baraya/auth/config` |

Profil build EAS sudah membawa nilainya masing-masing (`eas.json`):

| Profil | API |
| --- | --- |
| `development`, `preview` | `https://api.alsabbat.com` |
| `production`, `production-apk` | `https://api.alsabbat.com` |

Fallback runtime (bila env kosong) juga `https://api.alsabbat.com`.

---

## 4. Menjalankan saat pengembangan

```bash
cd mobile
yarn install
npx expo start            # buka di Expo Go / development build
```

Validasi tanpa perangkat:

```bash
npx expo-doctor                                        # 21/21 checks
npx eslint .                                           # 0 error
npx expo export --platform android --no-bytecode -c    # bundling Metro sukses
```

> Catatan container: kompilasi Hermes (`hermesc`) tidak dapat dijalankan di
> container Linux ini, karena itu validasi bundling memakai `--no-bytecode`.
> Build EAS di cloud menjalankan Hermes secara normal.

---

## 5. Build Android (APK / AAB)

Project sudah siap untuk EAS Build. Identitas aplikasi:
`com.alsabbat.mobile` (Android package & iOS bundle id), versi `1.0.0`.

```bash
cd mobile
npm i -g eas-cli            # sekali saja
eas login                   # akun Expo pemilik aplikasi  ← LANGKAH TERAKHIR YANG MASIH PERLU AKUN
eas init                    # menautkan project & mengisi EAS projectId

# APK untuk uji instal langsung
eas build --platform android --profile preview

# AAB untuk Google Play
eas build --platform android --profile production

# (opsional) APK dengan konfigurasi production
eas build --platform android --profile production-apk
```

Build lokal (`eas build --local`) membutuhkan JDK + Android SDK; container ini
tidak memilikinya, sehingga build binary dilakukan di EAS cloud atau di mesin
yang punya Android SDK.

### Regenerasi asset native
```bash
python3 scripts/prepare-native-assets.py
```
Sumber tunggal ada di `assets/source/`:

| File sumber | Dipakai untuk |
| --- | --- |
| `alsabbat-logo.png` | logo resmi klub, **background transparan** → app icon, adaptive icon, splash, logo in-app, favicon |
| `onboarding-1.png` | slide onboarding 1 (foto tim) |
| `onboarding-2.png` | slide onboarding 2 |
| `onboarding-3.png` | slide onboarding 3 |

Script menolak berjalan bila logo sumber tidak transparan (alpha penuh), sehingga
kotak putih di belakang logo tidak mungkin terbawa lagi. App icon memakai latar
navy resmi `#012891` (icon iOS/Android tidak boleh transparan) — bukan putih.
Logo klub tidak pernah diganti, dibuat ulang, atau diubah bentuk/warnanya.

---

## 6. Foto pengajuan, push notification & QR member

| Fitur | Mobile | Backend existing/tambahan |
| --- | --- | --- |
| Foto pengajuan Pemain/Staf | `PhotoPicker` (kamera/galeri, preview, ganti, resize 1080px + kompres 0.75) | `POST /api/baraya/uploads/photo` → Media Service + koleksi `media` (tampil di Media Library Admin) |
| Push status pengajuan | `usePushNotifications` (token Expo saat login, dihapus saat logout, channel Android) | `POST /api/baraya/push/register` / `/unregister`, dikirim otomatis saat Admin menyetujui/menolak |
| QR kartu member | QR pada Member Card (isi: `‹web›/member/verifikasi/{member_code}`) | `GET /api/member/verify/{member_code}` (endpoint verifikasi yang sudah ada) |
| Scanner QR | `MemberScannerScreen` (expo-camera), hanya untuk akun peran **STAFF** | endpoint verifikasi yang sama |

Push memakai Expo Push Service. Untuk build produksi Android, kredensial FCM v1 perlu diunggah
sekali lewat `eas credentials`; iOS memerlukan APNs key pada akun Apple Developer.

## 7. Login Google (langkah operasional)

Backend melakukan pertukaran authorization code (`POST /api/baraya/google/login`)
dan hanya menerima `redirect_uri` berskema **https**. Karena itu aplikasi memakai
callback website resmi `https://‹domain›/auth/google` dan menangkapnya secara
native lewat Android App Link (sudah dideklarasikan di `app.config.js`).

Agar tombol “Masuk dengan Google” muncul dan berfungsi:
1. Isi `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` di environment backend
   (tombol otomatis tersembunyi selama belum diisi).
2. Daftarkan `https://‹domain›/auth/google` sebagai Authorized redirect URI di
   Google Cloud Console.
3. Publikasikan `https://‹domain›/.well-known/assetlinks.json` berisi SHA-256
   fingerprint keystore aplikasi (didapat dari `eas credentials`) agar App Link
   terverifikasi dan redirect kembali ke aplikasi.

Login email/kata sandi dan OTP email tidak memerlukan langkah tambahan.
