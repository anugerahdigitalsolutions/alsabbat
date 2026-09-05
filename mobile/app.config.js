/**
 * AL SABBAT — native Expo (React Native) application config.
 *
 * The API base URL is NEVER hard-coded in the app source: it comes from
 * `EXPO_PUBLIC_API_URL` (see `.env.example` for local dev and `eas.json` for
 * the staging / production build profiles) and is exposed to the runtime via
 * `expo.extra.apiUrl`.
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || '';
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'development';
const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://alsabbat.com';

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
      adaptiveIcon: {
        backgroundColor: NAVY,
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      permissions: ['INTERNET'],
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
      'expo-font',
      'expo-image',
      'expo-web-browser',
    ],
    extra: {
      apiUrl: API_URL,
      appEnv: APP_ENV,
      webUrl: WEB_URL,
      googleRedirectUri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI || `${WEB_URL}/auth/google`,
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
    },
  },
});
