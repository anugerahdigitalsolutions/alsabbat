import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiErrorMessage, barayaTokenStore } from '../lib/api';
import {
  barayaGoogleLogin,
  barayaLogin,
  barayaLogout,
  barayaMe,
  barayaRegister,
  barayaVerifyOtp,
} from '../services/barayaAuth';
import { canAccessGallery, roleOf } from '../lib/memberAccess';

const BarayaAuthContext = createContext(null);

export const BarayaAuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!barayaTokenStore.get()) {
      setCustomer(null);
      setLoading(false);
      return null;
    }
    try {
      const data = await barayaMe();
      setCustomer(data);
      return data;
    } catch (e) {
      barayaTokenStore.clear();
      setCustomer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const login = useCallback(async (email, password) => {
    try {
      const data = await barayaLogin({ email, password });
      setCustomer(data);
      return { ok: true, customer: data };
    } catch (error) {
      return {
        ok: false,
        // 403 = email belum diverifikasi (Fase 3) → lanjut ke langkah OTP.
        needsVerification: error?.response?.status === 403,
        message: apiErrorMessage(error, 'Email atau kata sandi tidak sesuai.'),
      };
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const data = await barayaRegister(payload);
      return { ok: true, ...data };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error, 'Pendaftaran gagal. Coba lagi.') };
    }
  }, []);

  const verifyOtp = useCallback(async ({ email, code }) => {
    try {
      const data = await barayaVerifyOtp({ email, code });
      setCustomer(data);
      return { ok: true, customer: data };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error, 'Kode verifikasi salah atau kedaluwarsa.') };
    }
  }, []);

  const googleLogin = useCallback(async ({ code, redirectUri }) => {
    try {
      const data = await barayaGoogleLogin({ code, redirectUri });
      setCustomer(data);
      return { ok: true, customer: data };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error, 'Login Google gagal. Coba lagi.') };
    }
  }, []);

  const logout = useCallback(async () => {
    await barayaLogout();
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      login,
      register,
      verifyOtp,
      googleLogin,
      logout,
      reload,
      isBaraya: !!customer,
      role: roleOf(customer),
      canViewGallery: canAccessGallery(customer),
    }),
    [customer, loading, login, register, verifyOtp, googleLogin, logout, reload]
  );

  return <BarayaAuthContext.Provider value={value}>{children}</BarayaAuthContext.Provider>;
};

export const useBaraya = () => {
  const ctx = useContext(BarayaAuthContext);
  if (!ctx) throw new Error('useBaraya must be used inside BarayaAuthProvider');
  return ctx;
};
