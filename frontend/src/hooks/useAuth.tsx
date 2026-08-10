import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  viewMode: 'Admin' | 'Operator';
  setViewMode: (mode: 'Admin' | 'Operator') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize from localStorage so refresh doesn't kick you out of Admin mode
  const [viewMode, setViewModeState] = useState<'Admin' | 'Operator'>(() => {
    return (localStorage.getItem('viewMode') as 'Admin' | 'Operator') || 'Operator';
  });

  const setViewMode = (mode: 'Admin' | 'Operator') => {
    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  };

  const logout = useCallback(async () => {
    try { await authAPI.logout(); } catch (e) { console.error(e); }
    finally {
      localStorage.clear();
      setUser(null);
      setViewModeState('Operator');
      window.location.href = '/login';
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      authAPI.getProfile()
        .then((res) => setUser(res.data))
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [logout]);

  const login = async (data: any) => {
    const response = await authAPI.login(data);
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    setUser(response.data.user);
    setViewMode('Operator'); // Always start as Operator for safety
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, logout, 
      isAuthenticated: !!user, viewMode, setViewMode 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};