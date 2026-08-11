import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';

// Layouts & Guards
import DesktopLayout from './components/Layout/DesktopLayout';
import { SudoProtectedRoute } from './components/common/SudoProtectedRoute';

// Pages
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/Errors/UnauthorizedPage';

import CameraMonitoringPage from './pages/CameraMonitoringPage';
import AuditLogPage from './pages/AuditLogPage';
import AccountCreationPage from './pages/AccountCreationPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

/**
 * Basic Authentication Guard
 *
 * Ensures the user is authenticated before
 * accessing private Desktop routes.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LoadingOverlay
        visible
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/desktop/login" replace />;
  }

  return <>{children}</>;
}

export default function DesktopRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <LoadingOverlay
        visible
        zIndex={1000}
        overlayProps={{ blur: 2 }}
      />
    );
  }

  return (
    <Routes>
      {/* =========================================
          PUBLIC / AUTH ROUTES
         ========================================= */}

      <Route
        path="login"
        element={
          isAuthenticated ? (
            <Navigate to="/desktop/cameras" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      <Route
        path="unauthorized"
        element={<UnauthorizedPage />}
      />

      {/* =========================================
          PRIVATE DESKTOP APPLICATION
         ========================================= */}

      <Route
        element={
          <AuthGuard>
            <DesktopLayout />
          </AuthGuard>
        }
      >
        {/* Default Desktop Page */}
        <Route
          index
          element={<Navigate to="cameras" replace />}
        />

        {/* =========================================
            DESKTOP OPERATIONAL ROUTES
           ========================================= */}

        <Route
          path="cameras"
          element={<CameraMonitoringPage />}
        />

        {/* =========================================
            ADMIN-ONLY ROUTES
           ========================================= */}

        <Route
          path="accounts"
          element={
            <SudoProtectedRoute>
              <AccountCreationPage />
            </SudoProtectedRoute>
          }
        />

        <Route
          path="audit"
          element={
            <SudoProtectedRoute>
              <AuditLogPage />
            </SudoProtectedRoute>
          }
        />

        <Route
          path="settings"
          element={
            <SudoProtectedRoute>
              <SettingsPage />
            </SudoProtectedRoute>
          }
        />

        <Route
          path="profile"
          element={
            <SudoProtectedRoute>
              <ProfilePage />
            </SudoProtectedRoute>
          }
        />
      </Route>

      {/* =========================================
          DESKTOP FALLBACK
         ========================================= */}

      <Route
        path="*"
        element={<Navigate to="/desktop" replace />}
      />
    </Routes>
  );
}