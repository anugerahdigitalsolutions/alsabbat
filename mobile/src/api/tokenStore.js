/**
 * Session token storage for the existing Baraya/customer auth of the ALSABBAT
 * backend. SecureStore is used when available (Android keystore), with an
 * AsyncStorage fallback so the app never crashes on unsupported devices.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const KEY = 'alsabbat.baraya.token';

let cached = null;

async function secureAvailable() {
  try {
    return await SecureStore.isAvailableAsync();
  } catch (e) {
    return false;
  }
}

export const tokenStore = {
  peek: () => cached,
  async get() {
    if (cached) return cached;
    try {
      if (await secureAvailable()) {
        cached = await SecureStore.getItemAsync(KEY);
      }
      if (!cached) cached = await AsyncStorage.getItem(KEY);
    } catch (e) {
      cached = null;
    }
    return cached;
  },
  async set(token) {
    cached = token || null;
    try {
      if (token && (await secureAvailable())) {
        await SecureStore.setItemAsync(KEY, token);
        return;
      }
      if (token) await AsyncStorage.setItem(KEY, token);
    } catch (e) {
      if (token) await AsyncStorage.setItem(KEY, token).catch(() => {});
    }
  },
  async clear() {
    cached = null;
    try {
      if (await secureAvailable()) await SecureStore.deleteItemAsync(KEY);
    } catch (e) {
      /* ignore */
    }
    await AsyncStorage.removeItem(KEY).catch(() => {});
  },
};

export default tokenStore;
