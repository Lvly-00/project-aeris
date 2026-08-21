import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';


export function SudoProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, viewMode, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  const isDesktop = useMediaQuery('(min-width: 768px)');


  if (loading) return <LoadingOverlay visible />;

  // 1. Not logged in?
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Not a CCTV Chief OR in Operator Mode? 
  // This is the fix: if session resets viewMode to Operator, this triggers immediately.
  if (isDesktop && user?.role === 'CCTV Chief' && viewMode !== 'Admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}