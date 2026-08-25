import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { apiErrorMessage, tokenStore } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
      return data;
    } catch (e) {
      tokenStore.clear();
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      tokenStore.set(data.access_token);
      setUser(data.user);
      return { ok: true, user: data.user };
    } catch (error) {
      return { ok: false, message: apiErrorMessage(error, 'Email atau password salah.') };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      /* session may already be invalid */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (permission) => {
      if (!user) return false;
      const perms = user.permissions || [];
      if (perms.includes('*')) return true;
      if (perms.includes(permission)) return true;
      const resource = String(permission).split(':')[0];
      return perms.includes(`${resource}:*`);
    },
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, reload: loadMe, hasPermission, isAuthenticated: !!user }),
    [user, loading, login, logout, loadMe, hasPermission]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
