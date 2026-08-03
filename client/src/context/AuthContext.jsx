import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('clearmate_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('clearmate_token'));
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verifyAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        const userData = res.data.data.user || res.data.data;
        setUser(userData);
        localStorage.setItem('clearmate_user', JSON.stringify(userData));
      } catch {
        // Token invalid or expired — clean up
        setUser(null);
        setToken(null);
        localStorage.removeItem('clearmate_token');
        localStorage.removeItem('clearmate_user');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('clearmate_token', newToken);
    localStorage.setItem('clearmate_user', JSON.stringify(userData));
    return userData;
  }, []);

  const register = useCallback(async (registerData) => {
    const res = await api.post('/auth/register', registerData);
    const { token: newToken, user: userData } = res.data.data;
    setToken(newToken);
    setUser(userData);
    localStorage.setItem('clearmate_token', newToken);
    localStorage.setItem('clearmate_user', JSON.stringify(userData));
    return userData;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('clearmate_token');
    localStorage.removeItem('clearmate_user');
  }, []);

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
