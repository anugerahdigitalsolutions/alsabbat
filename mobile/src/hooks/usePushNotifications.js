/**
 * Push notification device registration (Expo Notifications).
 *
 * - Token Expo didaftarkan ke backend existing lewat endpoint tipis
 *   `POST /api/baraya/push/register` (satu dokumen per device → multi-device
 *   didukung), dan dihapus saat logout (`/push/unregister`).
 * - Isi notifikasi SELALU datang dari backend (perubahan status pengajuan,
 *   Broadcast admin) — aplikasi tidak pernah membuat notifikasi palsu.
 * - Notification center in-app existing tetap dipakai; handler ini hanya
 *   menyegarkan jumlah belum dibaca ketika notifikasi masuk.
 *
 * Diagnostik: log hanya aktif pada build development (`__DEV__`) dan token
 * selalu ditampilkan tersamar (tidak pernah utuh).
 */
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import * as endpoints from '../api/endpoints';
import { colors } from '../theme';

const ANDROID_CHANNEL_ID = 'default';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const debug = (message, extra) => {
  if (__DEV__) console.log(`[push] ${message}`, extra ?? '');
};

const maskToken = (token) => (token ? `${String(token).slice(0, 18)}…` : 'none');

/**
 * Channel Android WAJIB ada sebelum notifikasi masuk: backend mengirim
 * `channelId: "default"`, dan Android menolak menampilkan notifikasi bila
 * channel-nya belum terdaftar. Dibuat saat app start (bukan hanya saat login).
 */
export async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'AL SABBAT',
      importance: Notifications.AndroidImportance.MAX,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      lightColor: colors.accent,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    debug('android channel ready', ANDROID_CHANNEL_ID);
  } catch (e) {
    debug('android channel failed', e?.message);
  }
}

export async function getExpoPushToken() {
  if (!Device.isDevice) {
    debug('emulator/simulator: push token tidak tersedia');
    return null;
  }
  await ensureAndroidChannel();

  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  debug('permission status', status);
  if (status !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || undefined;
  if (!projectId) debug('projectId EAS tidak ditemukan (token kemungkinan gagal)');

  try {
    const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    debug('token acquired', maskToken(token?.data));
    return token?.data || null;
  } catch (e) {
    // Penyebab paling umum di Android: kredensial FCM belum dikonfigurasi.
    debug('token failed', e?.message);
    return null;
  }
}

/** Daftarkan device saat user login; hapus saat logout. */
export function usePushRegistration({ isAuthenticated, onNotification }) {
  const tokenRef = useRef(null);
  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  // Channel Android dibuat sekali saat app start, terlepas dari status login.
  useEffect(() => {
    ensureAndroidChannel();
  }, []);

  useEffect(() => {
    let alive = true;

    const register = async () => {
      if (!isAuthenticated || tokenRef.current) return;
      try {
        const token = await getExpoPushToken();
        if (!token || !alive) return;
        await endpoints.registerPushDevice({
          token,
          platform: Platform.OS,
          device_id: Device.osInternalBuildId || Device.modelName || undefined,
          app_version: Constants.expoConfig?.version || undefined,
        });
        tokenRef.current = token;
        debug('registered to backend', maskToken(token));
      } catch (e) {
        // registrasi push tidak boleh mengganggu pemakaian aplikasi
        debug('backend registration failed', e?.message);
      }
    };

    register();

    // Coba lagi saat app kembali aktif (mis. user baru mengizinkan notifikasi
    // dari Pengaturan, atau percobaan pertama gagal karena jaringan).
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') register();
    });

    return () => {
      alive = false;
      subscription.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener((notification) => {
      debug('notification received', notification?.request?.content?.title);
      if (callbackRef.current) callbackRef.current();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(() => {
      debug('notification tapped');
      if (callbackRef.current) callbackRef.current();
    });
    return () => {
      received.remove();
      tapped.remove();
    };
  }, []);

  return tokenRef;
}

/** Dipanggil sebelum logout agar device berhenti menerima push akun ini. */
export async function unregisterCurrentDevice() {
  try {
    const token = await getExpoPushToken();
    if (token) await endpoints.unregisterPushDevice({ token });
  } catch (e) {
    debug('unregister failed', e?.message);
  }
}

export default usePushRegistration;
