import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';


export function SudoProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, viewMode, loading, isAuthenticated } = useAuth();
  const location = useLocation();


  if (loading) return <LoadingOverlay visible />;

  // 1. Not logged in?
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Not in Chief (Admin) view?
  // Profile/Settings/Accounts/Audit are Chief-only. This also covers non-chief
  // roles, where viewMode is always 'Operator'.
  if (user && viewMode !== 'Admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}