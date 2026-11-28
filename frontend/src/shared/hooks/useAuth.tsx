import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { authAPI } from '../services/api';
import { User } from '../types';
import { setAccessToken, clearTokens } from '../utils/tokenStorage';
import { getDeviceId } from '../utils/device';

interface AuthContextType {
  user: User | null;
  setUser: Dispatch<SetStateAction<User | null>>;
  loading: boolean;
  login: (data: any) => Promise<{ requires_2fa?: boolean; email?: string; user?: User }>;
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
  if (window.location.pathname.startsWith('/desktop')) {
    return '/desktop/login';
  }

  return '/login';
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
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const { unsubscribeFromPush } = await import('../services/pushNotifications');
          await unsubscribeFromPush();
        } catch {
          /* best-effort */
        }
      }

      clearTokens();

      setUser(null);
      setViewModeState('Operator');

      // IMPORTANT:
      // Preserve the application the user is currently using.
      window.location.href = getCurrentLoginPath();
    }
  }, []);

  useEffect(() => {
    /*
     * The refresh token is an HttpOnly cookie, so there is no client-side
     * token to inspect first — always attempt a silent refresh. A missing or
     * expired cookie simply means "not signed in": drop the in-memory token
     * and continue with NO redirect (the API interceptor handles the
     * expired-session redirect for real authenticated requests).
     */
    authAPI
      .refresh()
      .then((res) => {
        setAccessToken(res.data.access);
        return authAPI.getProfile();
      })
      .then((res) => {
        setUser(res.data);
        // If the user has already granted push permission in a previous session,
        // silently re-subscribe so the backend has a current endpoint.
        // This runs only on the PWA (service worker required) and only when
        // permission was already granted — no prompt shown.
        if (
          res.data.receive_notifications &&
          'serviceWorker' in navigator &&
          'PushManager' in window &&
          Notification.permission === 'granted'
        ) {
          import('../services/pushNotifications').then(({ subscribeToPush }) => {
            subscribeToPush().catch(() => {/* best-effort */});
          });
        }
      })
      .catch(() => {
        // No refresh cookie / expired cookie: there is no session to restore.
        // Do NOT call logout() here — it hard-navigates to login, which would
        // hijack public pages like /forgot-password mid-flow.
        clearTokens();
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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

    // FR-LG-002 — `remember` goes to the backend, which decides how long the
    // HttpOnly refresh cookie lives. Only the short-lived access token comes
    // back in the body and is kept in memory.
    setAccessToken(response.data.access);

    // Always start in Operator mode.
    setViewMode('Operator');

    // Fire a follow-up GET /profile/ — same pattern as Facebook: the login
    // response carries only the tokens; a separate async fetch loads the user
    // object. Once setUser() runs, isAuthenticated flips to true and the
    // router redirects automatically — the login page disappears without the
    // component needing to call navigate() at all.
    const profile = await authAPI.getProfile();
    setUser(profile.data);

    return { user: profile.data };
  };

  const verify2FALogin = async (email: string, code: string, remember?: boolean) => {
    const deviceId = await getDeviceId();
    const response = await authAPI.verify2FALogin(email, code, deviceId, remember);
    setAccessToken(response.data.access);
    setViewMode('Operator');
    // Same pattern: fetch profile separately after storing tokens.
    const profile = await authAPI.getProfile();
    setUser(profile.data);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
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