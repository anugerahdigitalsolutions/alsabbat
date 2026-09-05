/**
 * Baraya (customer) auth — backed 1:1 by the EXISTING ALSABBAT endpoints:
 * /api/baraya/login, /register, /otp/request, /otp/verify, /google/login,
 * /me, /logout. No new auth system, no local user store.
 *
 * User-facing branding is always "AL SABBAT"; the internal API namespace
 * (`/api/baraya/*`) stays untouched.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import * as endpoints from '../api/endpoints';
import { setUnauthorizedHandler } from '../api/client';
import tokenStore from '../api/tokenStore';

const GALLERY_ROLES = ['PEMAIN', 'STAFF'];

const ROLE_LABELS = {
  GUEST: 'Pengunjung',
  MEMBER: 'Member',
  PEMAIN: 'Pemain',
  STAFF: 'Staf',
};

export const rolesOf = (customer) => {
  if (!customer) return [];
  const roles = Array.isArray(customer.roles) ? customer.roles : null;
  return roles && roles.length ? roles : [customer.role || 'MEMBER'];
};

export const roleLabel = (customer) => {
  const roles = rolesOf(customer);
  if (roles.includes('STAFF')) return 'Staf & Pemain';
  return ROLE_LABELS[roles[0]] || 'Member';
};

export const canAccessGallery = (customer) =>
  rolesOf(customer).some((role) => GALLERY_ROLES.includes(role));

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [config, setConfig] = useState({
    google_enabled: false,
    google_client_id: '',
    email_enabled: false,
  });

  const clearSession = useCallback(async () => {
    await tokenStore.clear();
    setCustomer(null);
    setUnreadCount(0);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = await tokenStore.get();
    if (!token) {
      setCustomer(null);
      return null;
    }
    try {
      const me = await endpoints.getMe();
      setCustomer(me);
      return me;
    } catch (e) {
      await clearSession();
      return null;
    }
  }, [clearSession]);

  const refreshUnread = useCallback(async () => {
    if (!(await tokenStore.get())) {
      setUnreadCount(0);
      return;
    }
    try {
      const data = await endpoints.getUnreadCount();
      setUnreadCount(Number(data?.unread ?? data?.count ?? data?.total ?? 0));
    } catch (e) {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setCustomer(null);
      setUnreadCount(0);
    });
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const cfg = await endpoints.authConfig();
        if (alive && cfg) setConfig(cfg);
      } catch (e) {
        /* config is optional — buttons simply stay hidden */
      }
      await refreshProfile();
      if (alive) setLoading(false);
      await refreshUnread();
    })();
    return () => {
      alive = false;
    };
  }, [refreshProfile, refreshUnread]);

  const login = useCallback(
    async ({ email, password }) => {
      const data = await endpoints.login({ email: email.trim().toLowerCase(), password });
      await tokenStore.set(data.access_token);
      const me = data.customer || (await endpoints.getMe());
      setCustomer(me);
      refreshUnread();
      return me;
    },
    [refreshUnread]
  );

  const register = useCallback(async (payload) => endpoints.register(payload), []);

  const requestOtp = useCallback(
    async (email, purpose = 'REGISTER') => endpoints.requestOtp(email.trim().toLowerCase(), purpose),
    []
  );

  const verifyOtp = useCallback(
    async ({ email, code }) => {
      const data = await endpoints.verifyOtp({ email: email.trim().toLowerCase(), code: code.trim() });
      await tokenStore.set(data.access_token);
      const me = data.customer || (await endpoints.getMe());
      setCustomer(me);
      refreshUnread();
      return me;
    },
    [refreshUnread]
  );

  const googleLogin = useCallback(
    async ({ code, redirectUri }) => {
      const data = await endpoints.googleLogin({ code, redirectUri });
      await tokenStore.set(data.access_token);
      const me = data.customer || (await endpoints.getMe());
      setCustomer(me);
      refreshUnread();
      return me;
    },
    [refreshUnread]
  );

  const logout = useCallback(async () => {
    try {
      await endpoints.logoutRequest();
    } catch (e) {
      /* session may already be invalid */
    }
    await clearSession();
  }, [clearSession]);

  const updateProfile = useCallback(async (payload) => {
    const me = await endpoints.updateMe(payload);
    setCustomer(me);
    return me;
  }, []);

  const value = useMemo(
    () => ({
      customer,
      loading,
      config,
      isAuthenticated: Boolean(customer),
      roles: rolesOf(customer),
      roleLabel: roleLabel(customer),
      canViewGallery: canAccessGallery(customer),
      unreadCount,
      login,
      register,
      requestOtp,
      verifyOtp,
      googleLogin,
      logout,
      updateProfile,
      refreshProfile,
      refreshUnread,
      setUnreadCount,
    }),
    [
      customer,
      loading,
      config,
      unreadCount,
      login,
      register,
      requestOtp,
      verifyOtp,
      googleLogin,
      logout,
      updateProfile,
      refreshProfile,
      refreshUnread,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
