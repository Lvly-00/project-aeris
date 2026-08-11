import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from 'react';

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

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

/**
 * Get the login route based on the application
 * currently being used.
 */
function getCurrentLoginPath() {
  if (window.location.pathname.startsWith('/pwa')) {
    return '/pwa/login';
  }

  return '/desktop/login';
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewModeState] = useState<
    'Admin' | 'Operator'
  >(() => {
    return (
      (localStorage.getItem('viewMode') as
        | 'Admin'
        | 'Operator') || 'Operator'
    );
  });

  const setViewMode = (mode: 'Admin' | 'Operator') => {
    setViewModeState(mode);
    localStorage.setItem('viewMode', mode);
  };

  const logout = useCallback(async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Don't clear everything in localStorage.
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('viewMode');

      setUser(null);
      setViewModeState('Operator');

      // IMPORTANT:
      // Preserve the application the user is currently using.
      window.location.href = getCurrentLoginPath();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('access_token');

    if (!token) {
      setLoading(false);
      return;
    }

    authAPI
      .getProfile()
      .then((res) => {
        setUser(res.data);
      })
      .catch(() => {
        logout();
      })
      .finally(() => {
        setLoading(false);
      });
  }, [logout]);

  const login = async (data: any) => {
    // If credentials are wrong, this throws.
    // The LoginPage will catch the error.
    const response = await authAPI.login(data);

    localStorage.setItem(
      'access_token',
      response.data.access
    );

    localStorage.setItem(
      'refresh_token',
      response.data.refresh
    );

    setUser(response.data.user);

    // Always start in Operator mode.
    setViewMode('Operator');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        viewMode,
        setViewMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};