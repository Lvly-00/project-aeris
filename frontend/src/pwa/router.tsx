import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth'; // Your hook path
import { LoadingOverlay, Box } from '@mantine/core';

// Layouts
import { AdminLayout } from './components/Layout/AdminLayout';
import { TanodLayout } from './components/Layout/TanodLayout';

// Pages
import DashboardPage from './pages/admin/DashboardPage';
import IncidentsPage from './pages/admin/IncidentPage';
import IncidentDetailPage from './pages/admin/IncidentDetailPage';

import HistoryPage from './pages/admin/HistoryPage';
import MessagePage from './pages/tanod/MessagePage';
import MessageDetailsPage from './pages/tanod/MessageDetailsPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

/**
 * Guard that checks if user is authenticated and matches the required role.
 * Role is typically a string on your User type (e.g. user.role)
 */
function RoleGuard({ children, allowedRole }: { children: React.ReactNode; allowedRole: string }) {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return <LoadingOverlay visible zIndex={1000} />;

    if (!isAuthenticated) {
        return <Navigate to="/pwa/login" replace />;
    }

    // Normalize role check (handling case sensitivity)
    const currentRole = user?.role?.toLowerCase();
    const targetRole = allowedRole.toLowerCase();

    if (currentRole !== targetRole) {
        // If they are in the wrong area, push them to their correct home
        return <Navigate to={currentRole === 'cctv chief' ? "/pwa/admin" : "/pwa/tanod"} replace />;
    }

    return <>{children}</>;
}

export default function PwaRouter() {
    const { isAuthenticated, user, loading } = useAuth();

    if (loading) {
        return (
            <Box h="100vh" pos="relative">
                <LoadingOverlay visible />
            </Box>
        );
    }

    const userRole = user?.role?.toLowerCase();

    return (
        <Routes>
            {/* Public Login Route */}
            <Route
                path="login"
                element={
                    isAuthenticated ? (
                        <Navigate to={userRole === 'cctv chief' ? "/pwa/admin" : "/pwa/tanod"} replace />
                    ) : (
                        <LoginPage />
                    )
                }
            />

            {/* Admin Application Section */}
            <Route
                path="admin"
                element={
                    <RoleGuard allowedRole="cctv chief">
                        <AdminLayout />
                    </RoleGuard>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="incidents/:id" element={<IncidentDetailPage />} />

                <Route path="history" element={<HistoryPage />} />
                <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Tanod Application Section */}
            <Route
                path="tanod"
                element={
                    <RoleGuard allowedRole="barangay tanod">
                        <TanodLayout />
                    </RoleGuard>
                }
            >
                <Route index element={<Navigate to="messages" replace />} />
                <Route path="messages" element={<MessagePage />} />
                {/* <Route path="messages/:id" element={<MessageDetailsPage />} /> */}
                <Route path="messages/:id" element={<MessageDetailsPage />} />

                <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* Root Redirection Logic */}
            <Route
                path="/"
                element={
                    <Navigate
                        to={!isAuthenticated ? "login" : (userRole === 'cctv chief' ? "admin" : "tanod")}
                        replace
                    />
                }
            />

            <Route path="*" element={<Navigate to="/pwa" replace />} />
        </Routes>
    );
}