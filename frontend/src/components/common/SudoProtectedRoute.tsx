import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingOverlay } from '@mantine/core';

export function SudoProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, viewMode, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingOverlay visible />;

  // 1. Not logged in?
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Not an Admin OR in Operator Mode? 
  // This is the fix: if session resets viewMode to Operator, this triggers immediately.
  if (user?.role !== 'Admin' || viewMode !== 'Admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}