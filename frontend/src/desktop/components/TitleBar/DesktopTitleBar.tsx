import { useEffect, useState } from 'react';
import './DesktopTitleBar.css';

/** Mirrors the payloads main.cjs sends on `update-status`. */
type UpdateStatus =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' | 'current' | 'downloaded'; version?: string }
  | { status: 'downloading'; percent: number }
  | { status: 'error'; message?: string };

const api = window.electronAPI;
const isMac = api?.platform === 'darwin';

// Applied at import time (before the first paint) so the reserved 40px strip
// never flashes in after render. The web/PWA build never gets this class.
if (api?.isDesktop) {
  document.documentElement.classList.add('electron-shell');
}

function MaximizeIcon({ restored }: { restored: boolean }) {
  if (restored) {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
           strokeWidth="1.15" strokeLinejoin="round" aria-hidden="true">
        <rect x="1.9" y="3.4" width="6.7" height="6.7" rx="0.8" />
        <path d="M3.6 3.4V2.3c0-.4.3-.7.7-.7h5c.4 0 .7.3.7.7v5c0 .4-.3.7-.7.7h-1.1" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
         strokeWidth="1.15" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.4" y="2.4" width="7.2" height="7.2" rx="0.8" />
    </svg>
  );
}

/**
 * Custom window chrome for the desktop app: replaces the native menu bar and
 * hosts the update control next to minimize. Renders nothing outside Electron.
 */
export default function DesktopTitleBar() {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!api?.isDesktop) return;
    let cancelled = false;

    api
      .isMaximized()
      .then((value) => {
        if (!cancelled) setMaximized(value);
      })
      .catch(() => {});

    const unsubscribeWindow = api.onWindowStateChange((state) => {
      setMaximized(state.maximized);
    });

    // Sync once (an update may have been found before this mounted), then
    // follow the main process.
    api
      .getUpdateStatus()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch(() => {});

    const unsubscribeUpdate = api.onUpdateStatus((value) => {
      setStatus(value as UpdateStatus);
    });

    return () => {
      cancelled = true;
      unsubscribeWindow();
      unsubscribeUpdate();
    };
  }, []);

  if (!api?.isDesktop) return null;

  const downloading = status.status === 'downloading';
  const showUpdate =
    status.status === 'available' || status.status === 'downloaded' || downloading;
  const percent = downloading ? Math.max(0, Math.min(100, Math.round(status.percent))) : 0;

  const label = downloading
    ? `${percent}%`
    : status.status === 'downloaded'
      ? 'Restart'
      : 'Update';

  const updateTitle = downloading
    ? `Downloading update — ${percent}%`
    : status.status === 'downloaded'
      ? 'Update downloaded — restart and install'
      : 'Update available — download update';

  const handleUpdateClick = () => {
    if (status.status === 'available') {
      void api.downloadUpdate();
    } else if (status.status === 'downloaded') {
      api.installUpdate();
    }
  };

  return (
    <header className="desktop-titlebar">
      <div className="desktop-titlebar__left">
        <img
          className="desktop-titlebar__logo"
          src="/icon.png"
          alt="AERIS"
          draggable={false}
        />
        <span className="desktop-titlebar__divider" aria-hidden="true" />
      </div>

      <div className="desktop-titlebar__right">
        {showUpdate && (
          <button
            type="button"
            className={`desktop-titlebar__update${downloading ? ' is-progress' : ''}`}
            onClick={handleUpdateClick}
            disabled={downloading}
            aria-label={updateTitle}
            title={updateTitle}
          >
            {downloading ? (
              <svg className="desktop-titlebar__ring" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="2.2" opacity="0.22" />
                <circle
                  cx="8"
                  cy="8"
                  r="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray="37.7"
                  strokeDashoffset={37.7 * (1 - percent / 100)}
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3v11" />
                <path d="M7.5 9.5 12 14l4.5-4.5" />
                <path d="M4.5 19.5h15" />
              </svg>
            )}
            <span className="desktop-titlebar__update-label">{label}</span>
          </button>
        )}

        {!isMac && (
          <>
            <button
              type="button"
              className="desktop-titlebar__win"
              onClick={() => api.minimize()}
              aria-label="Minimize"
              title="Minimize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                   strokeWidth="1.15" strokeLinecap="round" aria-hidden="true">
                <path d="M2.2 6h7.6" />
              </svg>
            </button>

            <button
              type="button"
              className="desktop-titlebar__win"
              onClick={() => api.maximize()}
              aria-label={maximized ? 'Restore' : 'Maximize'}
              title={maximized ? 'Restore' : 'Maximize'}
            >
              <MaximizeIcon restored={maximized} />
            </button>

            <button
              type="button"
              className="desktop-titlebar__win desktop-titlebar__win--close"
              onClick={() => api.close()}
              aria-label="Close"
              title="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
                   strokeWidth="1.15" strokeLinecap="round" aria-hidden="true">
                <path d="M2.6 2.6l6.8 6.8M9.4 2.6 2.6 9.4" />
              </svg>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
