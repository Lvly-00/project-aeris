import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MantineProvider, createTheme, ColorSchemeScript } from '@mantine/core';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Styles
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
  },
});

const theme = createTheme({
  primaryColor: 'orange',
  colors: {
    // Customizing the dark scale
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E', // This is usually the body background in dark mode
      '#141517',
      '#101113',
    ],
  },
  fontFamily: 'Inter, system-ui, sans-serif',
  defaultRadius: 'md',
  headings: {
    fontFamily: 'Inter, system-ui, sans-serif',
  },
});

const isElectron = Boolean((window as any).electronAPI?.isDesktop);

// PWA service worker — not registered during Electron, and not registered
// during `vite dev` because the SW's cached HTML fights Vite's HMR.
// In production (and when accessed from a phone on the local network) the
// built output is served by the backend/nginx, so PROD is true and the SW
// registers normally.
//
// For local phone testing without a production build, you can temporarily
// change `import.meta.env.PROD` to `true` here, but revert before committing.
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isElectron) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      // Always fetch the latest sw.js so a bumped CACHE_NAME takes effect
      // promptly instead of waiting for the browser's SW HTTP cache.
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        registration.update().catch(() => {
          /* best-effort update check */
        });
      })
      .catch(() => {
        /* SW registration is best-effort; app works without it */
      });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* ColorSchemeScript must be before MantineProvider */}
    <ColorSchemeScript defaultColorScheme="light" />
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <BrowserRouter>
          <App  />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>
  </React.StrictMode>
);