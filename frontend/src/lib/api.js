import axios from 'axios';

/**
 * API client — base URL always comes from the environment.
 * Never hard-code backend URLs (Vercel/Railway readiness).
 */
export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
export const API_BASE = `${BACKEND_URL}/api`;

const TOKEN_KEY = 'alsabbat.admin.token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    if (status === 401 && !url.includes('/auth/login')) {
      tokenStore.clear();
      if (window.location.pathname.startsWith('/admin') && !window.location.pathname.endsWith('/login')) {
        window.location.replace('/admin/login?expired=1');
      }
    }
    return Promise.reject(error);
  }
);

/** Extract a human readable message from a backend error envelope. */
export function apiErrorMessage(error, fallback = 'Terjadi kendala. Coba lagi.') {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
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

export default api;
