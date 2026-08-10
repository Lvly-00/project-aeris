import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader, Center } from '@mantine/core';

interface ProtectedRouteProps {
  children: JSX.Element;
  allowedRoles: string[]; // e.g. ['Admin', 'Operator']
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, viewMode, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <Center h="100vh"><Loader color="orange" /></Center>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Determine the effective role:
  // If the user is Admin, their "role" for UI purposes is whatever the viewMode is.
  // If they are not Admin, their role is their actual role (Tanod, etc.)
  const effectiveRole = user.role === 'Admin' ? viewMode : user.role;

  if (!allowedRoles.includes(effectiveRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}