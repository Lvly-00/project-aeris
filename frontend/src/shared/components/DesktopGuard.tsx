
import { Navigate } from 'react-router-dom';
import { isDesktopApp } from '../types/appTarget';

export default function DesktopGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isDesktopApp) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}