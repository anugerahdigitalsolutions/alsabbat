import { barayaApi, barayaTokenStore } from '../lib/api';

/** Baraya AL SABBAT (public customer) auth — separate from Admin/RBAC. */
export const BARAYA_AUTH_ENABLED = true;

export const barayaLogin = async ({ email, password }) => {
  const { data } = await barayaApi.post('/baraya/login', { email, password });
  barayaTokenStore.set(data.access_token);
  return data.customer;
};

export const barayaRegister = async (payload) => {
  const { data } = await barayaApi.post('/baraya/register', payload);
  return data;
};

export const barayaLogout = async () => {
  try {
    await barayaApi.post('/baraya/logout');
  } catch (e) {
    /* session may already be invalid */
  }
  barayaTokenStore.clear();
};

export const barayaMe = async () => {
  const { data } = await barayaApi.get('/baraya/me');
  return data;
};

export const barayaUpdateProfile = async (payload) => {
  const { data } = await barayaApi.patch('/baraya/me', payload);
  return data;
};

export const barayaUploadPhoto = async (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await barayaApi.post('/baraya/me/photo', form, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: (event) => {
      if (event.total && onProgress) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return { url: data.photo_url };
};

export const barayaDeletePhoto = async () => {
  const { data } = await barayaApi.delete('/baraya/me/photo');
  return data;
};

export const barayaMemberCard = async () => {
  const { data } = await barayaApi.get('/baraya/member-card');
  return data;
};

export const barayaChangePassword = (payload) => barayaApi.post('/baraya/change-password', payload);

export const barayaForgotPassword = (email) => barayaApi.post('/baraya/forgot-password', { email });

export const barayaResetPassword = (payload) => barayaApi.post('/baraya/reset-password', payload);

/* ------------------------------------------------- Fase 3: OTP, Google, peran */

export const barayaAuthConfig = async () => {
  const { data } = await barayaApi.get('/baraya/auth/config');
  return data;
};

export const barayaRequestOtp = async (email, purpose = 'REGISTER') => {
  const { data } = await barayaApi.post('/baraya/otp/request', { email, purpose });
  return data;
};

export const barayaVerifyOtp = async ({ email, code }) => {
  const { data } = await barayaApi.post('/baraya/otp/verify', { email, code });
  barayaTokenStore.set(data.access_token);
  return data.customer;
};

export const barayaResetPasswordOtp = async (payload) => {
  const { data } = await barayaApi.post('/baraya/reset-password-otp', payload);
  return data;
};

export const barayaGoogleLogin = async ({ code, redirectUri }) => {
  const { data } = await barayaApi.post('/baraya/google/login', {
    code,
    redirect_uri: redirectUri,
  });
  barayaTokenStore.set(data.access_token);
  return data.customer;
};

export const barayaCreateApplication = async (payload) => {
  const { data } = await barayaApi.post('/baraya/applications', payload);
  return data;
};

export const barayaMyApplications = async () => {
  const { data } = await barayaApi.get('/baraya/applications/mine');
  return data;
};

export const barayaOrders = async () => {
  const { data } = await barayaApi.get('/baraya/orders');
  return data;
};

export const barayaOrderDetail = async (orderId) => {
  const { data } = await barayaApi.get(`/baraya/orders/${orderId}`);
  return data;
};
