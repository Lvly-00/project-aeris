import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on the current mode (development, production, etc.)
  // The third parameter '' allows loading all variables regardless of VITE_ prefix
  const env = loadEnv(mode, process.cwd(), '');

  const APP_TARGET = env.VITE_APP_TARGET || 'pwa';
  const isDesktop = APP_TARGET === 'desktop';

  // Base URLs depend on target
  // Desktop retains full paths; PWA strips any /pwa prefix
  const BACKEND_URL = env.VITE_BACKEND_URL || (isDesktop ? 'http://localhost:8000' : 'http://localhost:8000');
  const WS_BACKEND_URL = env.VITE_WS_BACKEND_URL || (isDesktop ? 'ws://localhost:8000' : 'ws://localhost:8000');
  const AI_URL = env.VITE_AI_URL || (isDesktop ? 'http://localhost:8005' : 'http://localhost:8005');

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        // 1. Django Rest API
        '/api': {
          target: BACKEND_URL,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Accept-Encoding', 'identity');
            });
          },
        },
        // 2. Django WebSockets (Incidents)
        '/ws': {
          target: WS_BACKEND_URL,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
        // 3. AI FastAPI Service
        '/ai': {
          target: AI_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/ai/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Accept-Encoding', 'identity');
            });
          },
        },
      },
    },
  };
});