import { Routes, Route, Navigate } from 'react-router-dom';

import DesktopRouter from './desktop/router';
import PwaRouter from './pwa/router';

import AppGuard from './shared/components/AppGuard';

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