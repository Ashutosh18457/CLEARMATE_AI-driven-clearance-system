import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

const INACTIVITY_TIMEOUT_MS = 25 * 60 * 1000; // 25 minutes of inactivity

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = sessionStorage.getItem('clearmate_user') || localStorage.getItem('clearmate_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => {
    return sessionStorage.getItem('clearmate_token') || localStorage.getItem('clearmate_token');
  });

  const [loading, setLoading] = useState(true);
  const activityTimerRef = useRef(null);

  const clearAuthStorage = useCallback(() => {
    sessionStorage.removeItem('clearmate_token');
    sessionStorage.removeItem('clearmate_user');
    localStorage.removeItem('clearmate_token');
    localStorage.removeItem('clearmate_user');
    localStorage.removeItem('token');
  }, []);

  const logout = useCallback((reason) => {
    setUser(null);
    setToken(null);
    clearAuthStorage();
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    if (reason) {
      toast.error(reason);
    }
  }, [clearAuthStorage]);

  // ─── Verify token on mount ───
  useEffect(() => {
    const verifyAuth = async () => {
      const currentToken = sessionStorage.getItem('clearmate_token') || localStorage.getItem('clearmate_token');
      if (!currentToken) {
        setUser(null);
        setToken(null);
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        const userData = res.data.data.user || res.data.data;
        setUser(userData);
        // Persist strictly in sessionStorage for session-only isolation
        sessionStorage.setItem('clearmate_user', JSON.stringify(userData));
        sessionStorage.setItem('clearmate_token', currentToken);
        localStorage.removeItem('clearmate_token');
        localStorage.removeItem('clearmate_user');
      } catch {
        // Token invalid or expired — clean up immediately
        logout('Session expired. Please log in again.');
      } finally {
        setLoading(false);
      }
    };
    verifyAuth();
  }, [logout]);

  // ─── Inactivity Auto-Logout Mechanism ───
  useEffect(() => {
    if (!token || !user) return;

    const resetInactivityTimer = () => {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      activityTimerRef.current = setTimeout(() => {
        logout('Session timed out due to 25 minutes of inactivity.');
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Events to monitor user activity
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => window.addEventListener(evt, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetInactivityTimer));
    };
  }, [token, user, logout]);

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data.data;
    setToken(newToken);
    setUser(userData);

    // Save exclusively to sessionStorage (destroyed on tab/browser close)
    sessionStorage.setItem('clearmate_token', newToken);
    sessionStorage.setItem('clearmate_user', JSON.stringify(userData));
    localStorage.removeItem('clearmate_token');
    localStorage.removeItem('clearmate_user');

    return userData;
  }, []);

  const register = useCallback(async (registerData) => {
    const res = await api.post('/auth/register', registerData);
    const { token: newToken, user: userData } = res.data.data;
    setToken(newToken);
    setUser(userData);

    sessionStorage.setItem('clearmate_token', newToken);
    sessionStorage.setItem('clearmate_user', JSON.stringify(userData));
    localStorage.removeItem('clearmate_token');
    localStorage.removeItem('clearmate_user');

    return userData;
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
