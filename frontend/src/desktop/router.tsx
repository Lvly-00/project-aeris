import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';

// Layouts & Guards
import DesktopLayout from './components/DesktopLayout';
import { SudoProtectedRoute } from './components/common/SudoProtectedRoute';
import UnauthorizedPage from './pages/Errors/UnauthorizedPage';

// Shared Pages
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';

// Desktop Pages
import CameraMonitoringPage from './pages/CameraMonitoringPage';
import AuditLogPage from './pages/AuditLogPage';
import AccountCreationPage from './pages/AccountCreationPage';

// Mobile / PWA Pages
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import DispatchPage from './pages/DispatchPage';

/**
 * Basic Auth Guard: 
 * Ensures a user is logged in before allowing access to any app route.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 2 }} />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}

export function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 2 }} />;

  return (
    <Routes>
      {/* PUBLIC / AUTH ROUTES */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* PRIVATE APP ROUTES (Wrapped in DesktopLayout) */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <DesktopLayout />
          </AuthGuard>
        }
      >
        {/* Default Redirect */}
        <Route index element={<Navigate to="/cameras" replace />} />

        {/* SHARED DESKTOP ROUTES */}
        <Route path="cameras" element={<CameraMonitoringPage />} />
        <Route path="settings" element={<SudoProtectedRoute><SettingsPage /></SudoProtectedRoute>} />
        <Route path="profile" element={<SudoProtectedRoute><ProfilePage /></SudoProtectedRoute>} />



        {/* ADMIN-ONLY ROUTES (Sudo Protected) */}
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

        {/* MOBILE / PWA ROUTES (Also inside Layout) */}
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="dispatch" element={<DispatchPage />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}