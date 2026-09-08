/**
 * Axios client for the EXISTING ALSABBAT FastAPI backend.
 *
 * - Base URL berasal dari konfigurasi (`expo.extra.apiUrl` /
 *   `EXPO_PUBLIC_API_URL`) dengan fallback ke API produksi AL SABBAT.
 * - Auth uses the existing customer endpoints (`/api/baraya/*`); the app never
 *   implements its own auth or business logic.
 */
import axios from 'axios';
import Constants from 'expo-constants';

import tokenStore from './tokenStore';

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};

/** Production API AL SABBAT — fallback terakhir agar base URL tidak pernah kosong. */
const DEFAULT_API_URL = 'https://api.alsabbat.com';

export const BACKEND_URL = String(
  extra.apiUrl || process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/$/, '');
export const APP_ENV = extra.appEnv || process.env.EXPO_PUBLIC_APP_ENV || 'development';
export const WEB_URL = String(extra.webUrl || process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/$/, '');
export const GOOGLE_REDIRECT_URI = extra.googleRedirectUri || `${WEB_URL}/auth/google`;
export const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || '';
export const API_BASE = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 25000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

/** Deteksi FormData yang aman di runtime React Native. */
const isFormData = (value) =>
  typeof FormData !== 'undefined' && value instanceof FormData;

/**
 * Hapus header Content-Type untuk request multipart.
 *
 * PENTING: boundary multipart HANYA bisa dibuat oleh runtime (XHR React
 * Native). Kalau klien menetapkan `Content-Type` sendiri — baik
 * `application/json` (default instance ini) maupun `multipart/form-data`
 * tanpa boundary — body terkirim tanpa boundary dan backend menolak upload.
 * `AxiosHeaders` menyimpan key ternormalisasi, jadi `delete obj['Content-Type']`
 * saja tidak selalu cukup → pakai API `headers.delete()` bila tersedia.
 */
const stripContentType = (headers) => {
  if (!headers) return;
  if (typeof headers.delete === 'function') {
    headers.delete('Content-Type');
    return;
  }
  delete headers['Content-Type'];
  delete headers['content-type'];
};

api.interceptors.request.use(async (config) => {
  const token = tokenStore.peek() || (await tokenStore.get());
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (isFormData(config.data)) stripContentType(config.headers);
  return config;
});

let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const PUBLIC_AUTH_PATHS = ['/baraya/login', '/baraya/register', '/baraya/otp', '/baraya/google'];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    const isAuthCall = PUBLIC_AUTH_PATHS.some((path) => url.includes(path));
    if (status === 401 && !isAuthCall) {
      await tokenStore.clear();
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

/** Local media URLs come back as `/api/media/files/...` → absolute. */
export const resolveMediaUrl = (url) => {
  if (!url) return null;
  const value = String(url);
  if (value.startsWith('/')) return `${BACKEND_URL}${value}`;
  return value;
};

/** Human readable message from the backend error envelope. */
export function apiErrorMessage(error, fallback = 'Terjadi kendala. Coba lagi.') {
  if (error?.code === 'ECONNABORTED') return 'Koneksi terlalu lama. Coba lagi.';
  const data = error?.response?.data;
  if (!data) {
    if (error?.message === 'Network Error') return 'Tidak ada koneksi ke server AL SABBAT.';
    return error?.message || fallback;
  }
  if (typeof data === 'string') return data;
  if (data?.error?.message) {
    const details = data?.error?.details;
    if (Array.isArray(details) && details.length) {
      const first = details[0];
      const field = Array.isArray(first?.loc) ? first.loc.slice(1).join('.') : '';
      return `${data.error.message}${field ? ` — ${field}: ${first.msg}` : ''}`;
    }
    return data.error.message;
  }
  if (data?.detail) return typeof data.detail === 'string' ? data.detail : fallback;
  return fallback;
}

export const errorStatus = (error) => error?.response?.status || null;

/**
 * Endpoint belum tersedia di backend yang terpasang (mis. server produksi
 * belum di-deploy ke versi terbaru). Dipakai untuk fallback ke endpoint
 * existing lain / menyembunyikan fitur — tanpa data palsu.
 */
export const isEndpointMissing = (error) => [404, 405, 501].includes(errorStatus(error));

export default api;
