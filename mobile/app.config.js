/**
 * AL SABBAT — native Expo (React Native) application config.
 *
 * The API base URL comes from `EXPO_PUBLIC_API_URL` (lihat `.env.example`
 * untuk dev dan `eas.json` untuk semua profil build) dan diexpose ke runtime
 * via `expo.extra.apiUrl`. Fallback = API produksi https://api.alsabbat.com.
 */
/** Production API AL SABBAT — dipakai sebagai fallback bila env tidak di-set. */
const DEFAULT_API_URL = 'https://api.alsabbat.com';
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://alsabbat.com';

/** EAS project id (dapat dioverride lewat env untuk CI). */
const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || '151bea75-ec66-45b0-848f-26d4cd0f13f0';

const NAVY = '#012891';
const GOLD = '#FCCF2B';

/**
 * Android App Link for the Google OAuth redirect. The existing backend only
 * accepts `https://` redirect URIs (see GoogleLoginPayload), so the app reuses
 * the website callback path `/auth/google` and captures it natively.
 */
const webHost = (() => {
  try {
    return new URL(WEB_URL).host;
  } catch (e) {
    return 'alsabbat.com';
  }
})();

module.exports = () => ({
  expo: {
    name: 'AL SABBAT',
    slug: 'alsabbat',
    scheme: 'alsabbat',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#04091A',
    primaryColor: GOLD,
    assetBundlePatterns: ['**/*'],
    android: {
      package: 'com.alsabbat.mobile',
      versionCode: 1,
      icon: './assets/icon.png',
      adaptiveIcon: {
        // Fallback bila launcher tidak memakai `backgroundImage`: pakai hitam
        // pekat mengikuti latar app icon baru (gradasi hitam -> biru klub).
        backgroundColor: '#02050E',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['INTERNET', 'CAMERA'],
      softwareKeyboardLayoutMode: 'pan',
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [{ scheme: 'https', host: webHost, pathPrefix: '/auth/google' }],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    ios: {
      icon: './assets/icon.png',
      bundleIdentifier: 'com.alsabbat.mobile',
      buildNumber: '1',
      supportsTablet: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 220,
          resizeMode: 'contain',
          backgroundColor: NAVY,
        },
      ],
      'expo-secure-store',
      [
        'expo-image-picker',
        {
          photosPermission:
            'AL SABBAT memerlukan akses galeri untuk memilih foto pengajuan Pemain/Staf.',
          cameraPermission:
            'AL SABBAT memerlukan akses kamera untuk mengambil foto pengajuan Pemain/Staf.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'AL SABBAT memerlukan akses kamera untuk memindai QR kartu member saat verifikasi.',
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/android-icon-monochrome.png',
          color: NAVY,
        },
      ],
      'expo-font',
      'expo-image',
      'expo-video',
      'expo-web-browser',
    ],
    extra: {
      apiUrl: API_URL,
      appEnv: APP_ENV,
      webUrl: WEB_URL,
      googleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || `${WEB_URL}/auth/google`,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      eas: { projectId: EAS_PROJECT_ID },
    },
  },
});
