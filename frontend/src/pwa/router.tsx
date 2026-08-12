import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';

// PWA Layout
import { PwaLayout } from './components/Layout/PwaLayout';

// Admin Pages
import DashboardPage from './pages/admin/DashboardPage';
import IncidentsPage from './pages/admin/IncidentPage';
import IncidentDetailPage from './pages/admin/IncidentDetailPage';
import HistoryPage from './pages/admin/HistoryPage';

// Tanods Page

// Shared Pages
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationPage';


/**
 * Basic Authentication Guard
 *
 * Ensures the user is authenticated before
 * accessing private PWA routes.
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
        return <Navigate to="/pwa/login" replace />;
    }

    return <>{children}</>;
}

export default function PwaRouter() {
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
                        <Navigate to="/pwa/dashboard" replace />
                    ) : (
                        <LoginPage />
                    )
                }
            />

            {/* =========================================
          PRIVATE PWA APPLICATION
         ========================================= */}

            <Route
                element={
                    <AuthGuard>
                        <PwaLayout />
                    </AuthGuard>
                }
            >
                {/* Default PWA Page */}
                <Route
                    index
                    element={<Navigate to="dashboard" replace />}
                />


                <Route
                    path="dashboard"
                    element={<DashboardPage />}
                />


                <Route
                    path="incidents"
                    element={<IncidentsPage />}
                />

                <Route
                    path="incidents/:id"
                    element={<IncidentDetailPage />}
                />

                <Route
                    path="history"
                    element={<HistoryPage />}
                />



                <Route
                    path="notifications"
                    element={<NotificationsPage />}
                />



                <Route
                    path="profile"
                    element={<ProfilePage />}
                />
            </Route>

            {/* =========================================
            PWA FALLBACK
            ========================================= */}

            <Route
                path="*"
                element={<Navigate to="/pwa" replace />}
            />
        </Routes>
    );
}