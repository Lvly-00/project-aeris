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
import { getAccessToken, setTokens, clearTokens } from '../utils/tokenStorage';
import { getDeviceId } from '../utils/device';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: any) => Promise<{ requires_2fa?: boolean; email?: string }>;
  verify2FALogin: (email: string, code: string, remember?: boolean) => Promise<void>;
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
      // Backend blacklists the refresh token (FR-LG-012).
      await authAPI.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      clearTokens();

      setUser(null);
      setViewModeState('Operator');

      // IMPORTANT:
      // Preserve the application the user is currently using.
      window.location.href = getCurrentLoginPath();
    }
  }, []);

  useEffect(() => {
    const token = getAccessToken();

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
        // Stored token is dead/expired: drop it silently. Do NOT call
        // logout() here — it hard-navigates to login, which would hijack
        // public pages like /forgot-password mid-flow.
        clearTokens();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [logout]);

  const login = async (data: any) => {
    // If credentials are wrong, this throws.
    // The LoginPage will catch the error.
    const deviceId = await getDeviceId();
    const response = await authAPI.login({ ...data, device_id: deviceId });

    // FR-2F-007 — If 2FA is required, do NOT set tokens yet.
    // Return the flag so the Login page can show the VerificationCodeModal.
    if (response.data.requires_2fa) {
      return { requires_2fa: true, email: response.data.email };
    }

    // FR-LG-002 — Remember Me keeps the session on this trusted device
    // (localStorage); otherwise it ends when the browser session closes
    // (sessionStorage).
    setTokens(response.data.access, response.data.refresh, Boolean(data?.remember));

    setUser(response.data.user);

    // Always start in Operator mode.
    setViewMode('Operator');
    return {};
  };

  const verify2FALogin = async (email: string, code: string, remember?: boolean) => {
    const deviceId = await getDeviceId();
    const response = await authAPI.verify2FALogin(email, code, deviceId);
    setTokens(response.data.access, response.data.refresh, Boolean(remember));
    setUser(response.data.user);
    setViewMode('Operator');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verify2FALogin,
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