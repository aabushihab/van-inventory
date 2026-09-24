import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authApi.me();
      setUser(data);
    } catch (e) {
      sessionStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  async function login(username, password) {
    const { data } = await authApi.login(username, password);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage.setItem('refreshToken', data.refreshToken);
    setUser({
      id: data.userId,
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      branchId: data.branchId,
      preferredLang: data.preferredLang,
      permissions: data.permissions,
    });
    return data;
  }

  function logout() {
    sessionStorage.clear();
    setUser(null);
    window.location.href = '/login';
  }

  function hasPermission(code) {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return (user.permissions || []).includes(code);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, reload: loadCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
