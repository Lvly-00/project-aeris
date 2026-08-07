import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';
import { SudoProtectedRoute } from './components/common/SudoProtectedRoute';


import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

// Desktop 
import DesktopLayout from './components/DesktopLayout';
import CameraMonitoringPage from './pages/Desktop/CameraMonitoringPage';
import AuditLogPage from './pages/Desktop/AuditLogPage';
import SettingsPage from './pages/SettingsPage';
import AccountCreationPage from './pages/Desktop/AccountCreationPage'


//Mobile | PWA
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import RecommendationsPage from './pages/RecommendationsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ReportsPage from './pages/ReportsPage';
import NotificationsPage from './pages/NotificationsPage';
import DispatchPage from './pages/DispatchPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingOverlay visible />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingOverlay visible />;

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DesktopLayout />
          </ProtectedRoute>
        }
      >
        // Desktop
        <Route index element={<Navigate to="/cameras" replace />} />
        <Route path="cameras" element={<CameraMonitoringPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="accounts" element={<AccountCreationPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />


        // Mobile | PWA
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="incidents" element={<IncidentsPage />} />
        <Route path="incidents/:id" element={<IncidentDetailPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="dispatch" element={<DispatchPage />} />

      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
