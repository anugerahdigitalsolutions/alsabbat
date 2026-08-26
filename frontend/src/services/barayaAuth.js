import { barayaApi, barayaTokenStore } from '../lib/api';

/** Baraya ALSABBAT (public customer) auth — separate from Admin/RBAC. */
export const BARAYA_AUTH_ENABLED = true;

export const barayaLogin = async ({ email, password }) => {
  const { data } = await barayaApi.post('/baraya/login', { email, password });
  barayaTokenStore.set(data.access_token);
  return data.customer;
};

export const barayaRegister = async (payload) => {
  const { data } = await barayaApi.post('/baraya/register', payload);
  return data.customer;
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

export const barayaChangePassword = (payload) => barayaApi.post('/baraya/change-password', payload);

export const barayaForgotPassword = (email) => barayaApi.post('/baraya/forgot-password', { email });

export const barayaResetPassword = (payload) => barayaApi.post('/baraya/reset-password', payload);

export const barayaOrders = async () => {
  const { data } = await barayaApi.get('/baraya/orders');
  return data;
};

export const barayaOrderDetail = async (orderId) => {
  const { data } = await barayaApi.get(`/baraya/orders/${orderId}`);
  return data;
};
