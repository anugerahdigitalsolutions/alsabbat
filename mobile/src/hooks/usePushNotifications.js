/**
 * Push notification device registration (Expo Notifications).
 *
 * - Token Expo didaftarkan ke backend existing lewat endpoint tipis
 *   `POST /api/baraya/push/register` (satu dokumen per device → multi-device
 *   didukung), dan dihapus saat logout (`/push/unregister`).
 * - Isi notifikasi SELALU datang dari backend saat status pengajuan berubah
 *   (APPROVED/REJECTED) — aplikasi tidak pernah membuat notifikasi palsu.
 * - Notification center in-app existing tetap dipakai; handler ini hanya
 *   menyegarkan jumlah belum dibaca ketika notifikasi masuk.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import * as endpoints from '../api/endpoints';
import { colors } from '../theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'AL SABBAT',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: colors.accent,
    vibrationPattern: [0, 250, 250, 250],
  });
}

export async function getExpoPushToken() {
  if (!Device.isDevice) return null;
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== 'granted') {
    const asked = await Notifications.requestPermissionsAsync();
    status = asked.status;
  }
  if (status !== 'granted') return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId || undefined;
  const token = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  return token?.data || null;
}

/** Daftarkan device saat user login; hapus saat logout. */
export function usePushRegistration({ isAuthenticated, onNotification }) {
  const tokenRef = useRef(null);
  const callbackRef = useRef(onNotification);

  useEffect(() => {
    callbackRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isAuthenticated) return;
      try {
        const token = await getExpoPushToken();
        if (!token || !alive) return;
        tokenRef.current = token;
        await endpoints.registerPushDevice({
          token,
          platform: Platform.OS,
          device_id: Device.osInternalBuildId || Device.modelName || undefined,
          app_version: Constants.expoConfig?.version || undefined,
        });
      } catch (e) {
        /* registrasi push tidak boleh mengganggu pemakaian aplikasi */
      }
    })();
    return () => {
      alive = false;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(() => {
      if (callbackRef.current) callbackRef.current();
    });
    const tapped = Notifications.addNotificationResponseReceivedListener(() => {
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
    /* diamkan — logout tetap lanjut */
  }
}

export default usePushRegistration;
