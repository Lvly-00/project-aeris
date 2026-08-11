import { Navigate } from 'react-router-dom';
import { isElectron } from '../utils/isElectron';

interface AppGuardProps {
    target: 'desktop' | 'pwa';
    children: React.ReactNode;
}

export default function AppGuard({
    target,
    children,
}: AppGuardProps) {
    const electron = isElectron();

    // Browser/phone trying to access Desktop
    if (target === 'desktop' && !electron) {
        return <Navigate to="/pwa" replace />;
    }

    // Electron accidentally accessing PWA
    if (target === 'pwa' && electron) {
        return <Navigate to="/desktop" replace />;
    }

    return <>{children}</>;
}