import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then((r) => setUser(r.data || r.user || null))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  // Re-read the profile (CivicCreds, tier, badges) after something that can change it
  const refreshUser = useCallback(async () => {
    if (!getToken()) return null;
    try {
      const r = await api.me();
      const u = r.data || r.user || null;
      if (u) setUser(u);
      return u;
    } catch {
      return null;
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.login(email, password);
    setToken(r.token);
    setUser(r.user);
    refreshUser(); // the login response is a trimmed profile; fetch CivicCreds/tier in the background
    return r.user;
  }, [refreshUser]);

  const register = useCallback(async (payload) => {
    await api.register(payload);
    return login(payload.email, payload.password);
  }, [login]);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
