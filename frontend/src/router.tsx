import { Routes, Route, Navigate } from 'react-router-dom';

import DesktopRouter from './desktop/router';
import PwaRouter from './pwa/router';

import AppGuard from './shared/components/AppGuard';

// Shared auth pages (outside AppGuard — reachable from BOTH logins)
import ForgotPasswordPage from './shared/pages/ForgotPasswordPage';
import VerificationCodePage from './shared/pages/VerificationCodePage';
import ResetPasswordPage from './shared/pages/ResetPasswordPage';

export default function AppRouter() {
  return (
    <Routes>

      {/* =========================
          DESKTOP / ELECTRON
         ========================= */}
      <Route
        path="/desktop/*"
        element={
          <AppGuard target="desktop">
            <DesktopRouter />
          </AppGuard>
        }
      />

      {/* =========================
          PWA / MOBILE
         ========================= */}
      <Route
        path="/pwa/*"
        element={
          <AppGuard target="pwa">
            <PwaRouter />
          </AppGuard>
        }
      />

      {/* =========================
          SHARED PASSWORD RESET FLOW
          (?app=pwa|desktop returns the user to the correct login)
         ========================= */}
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verification-code" element={<VerificationCodePage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* =========================
          DEFAULT
         ========================= */}
      <Route
        path="/"
        element={<Navigate to="/pwa" replace />}
      />

      {/* =========================
          404
         ========================= */}
      <Route
        path="*"
        element={<Navigate to="/pwa" replace />}
      />

    </Routes>
  );
}