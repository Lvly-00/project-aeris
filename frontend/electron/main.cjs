/**
 * Aeris Desktop — BUNDLED CLIENT
 *
 * The desktop app ships with (or starts up alongside) the AI service, which
 * serves BOTH the built SPA and the /ai route set on ONE local origin
 * (http://localhost:8005 by default). The API and WebSocket always target the
 * deployed backend (https://project-aeris.onrender.com) — see resolveBackendUrl().
 * The app window simply loads that local bundle origin.
 *
 * App origin resolution order:
 *   1. AERIS_SERVER_URL environment variable
 *   2. server-url.txt inside the user data folder (one line, e.g.
 *      "http://localhost:8005") — editable by support without reinstalling
 *   3. The build-time packaged server URL (electron/server-url.json, written
 *      automatically by the build script — nothing for the user to edit)
 *   4. Default: http://localhost:8005 (local bundled ai-service)
 *
 * Backend origin resolution order (used for absolute asset / media URLs):
 *   1. AERIS_BACKEND_URL environment variable
 *   2. server-url.json "backendUrl" field (baked at build time)
 *   3. Default: https://project-aeris.onrender.com
 *
 * Development mode (`npm run dev:desktop`) loads the Vite dev server, whose
 * proxies forward /api, /ws and /ai to localhost services.
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn, spawnSync } = require('child_process');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
// macOS keeps its native title bar (traffic lights + app menu); every other
// platform uses the frameless window drawn by the renderer title bar.
const isMac = process.platform === 'darwin';

const DEV_FRONTEND_URL = 'http://localhost:5173';
const DEV_BACKEND_URL = 'http://localhost:8000';
const DEFAULT_BUNDLE_URL = 'http://localhost:8005';
const DEFAULT_BACKEND_URL = 'https://project-aeris.onrender.com';

let mainWindow = null;
let tray = null;
let aiProcess = null;
// When the configured bundle port is already taken (e.g. a leftover dev AI
// service), the bundled sidecar is started on a free port instead and the
// window loads from that port. /ai is same-origin, so nothing else changes.
let bundlePortOverride = null;

function writeLog(msg) {
  try {
    const logPath = path.join(app.getPath('userData'), 'app.log');
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${msg}\n`);
  } catch (_) {}
}

function resolveServerUrl() {
  let url = process.env.AERIS_SERVER_URL || '';

  if (!url) {
    try {
      const cfgPath = path.join(app.getPath('userData'), 'server-url.txt');
      if (fs.existsSync(cfgPath)) {
        url = fs.readFileSync(cfgPath, 'utf-8').trim();
      }
    } catch (_) {}
  }

  // Packaged fallback: server-url.json is written into the app at build time
  // by scripts\build-desktop.ps1 (or npm run build:desktop). Users never need
  // to edit files by hand.
  if (!url) {
    try {
      const bundled = path.join(__dirname, 'server-url.json');
      if (fs.existsSync(bundled)) {
        const parsed = JSON.parse(fs.readFileSync(bundled, 'utf-8'));
        url = (parsed && parsed.url || '').trim();
      }
    } catch (_) {}
  }

  if (!url) url = DEFAULT_BUNDLE_URL;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  url = url.replace(/\/+$/, '');

  // If the requested port was busy and we moved the local sidecar to another
  // port, rewrite the origin so the window (and its same-origin /ai calls)
  // follow the sidecar.
  if (bundlePortOverride) {
    try {
      const parsed = new URL(url);
      if (isLocalHost(parsed.hostname)) {
        parsed.port = String(bundlePortOverride);
        url = parsed.toString().replace(/\/+$/, '');
      }
    } catch (_) {}
  }

  return url;
}

function isLocalHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isLocalUrl(rawUrl) {
  try {
    return isLocalHost(new URL(rawUrl).hostname);
  } catch (_) {
    return false;
  }
}

// Return true when something is already accepting connections on the port.
// A bind test is unreliable on Windows: Node sets SO_REUSEADDR, so listen()
// can succeed even while another process holds the wildcard 0.0.0.0:port.
function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: '127.0.0.1', port });
    const done = (inUse) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(inUse);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1500, () => done(false));
  });
}

// Resolve with the first free TCP port at or after `start`.
async function findFreePort(start) {
  for (let port = start; port <= start + 50; port++) {
    if (!(await isPortInUse(port))) return port;
  }
  return start;
}

function resolveBackendUrl() {
  let url = process.env.AERIS_BACKEND_URL || '';

  if (!url) {
    try {
      const bundled = path.join(__dirname, 'server-url.json');
      if (fs.existsSync(bundled)) {
        const parsed = JSON.parse(fs.readFileSync(bundled, 'utf-8'));
        url = (parsed && parsed.backendUrl || '').trim();
      }
    } catch (_) {}
  }

  if (!url) url = DEFAULT_BACKEND_URL;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

// In the packaged product the AI service is expected at the local bundle
// origin. If a sidecar was packaged under resources/ai-service (built exe or
// start script), spawn it; otherwise log that it must be running already.
function ensureAiServiceBundled() {
  const candidates = ['ai-server.exe', 'ai-server.cmd', 'start-ai.cmd', 'start-ai.bat'];
  const aiDir = path.join(process.resourcesPath, 'ai-service');
  if (!fs.existsSync(aiDir)) {
    writeLog('ai-service sidecar not found in resources; expecting it to run already');
    return;
  }
  const executable = candidates.map((name) => path.join(aiDir, name)).find(fs.existsSync);
  if (!executable) {
    writeLog('No ai-service launcher found in resources; expecting it to run already');
    return;
  }
  writeLog(`Spawning bundled ai-service launcher: ${executable}`);
  // The sidecar reads its API keys from this file (run_sidecar.py). Without it
  // the service still boots but fails closed: every guarded /ai route 403s and
  // detection posts are rejected by the backend. Say so in the log instead of
  // leaving a silent, keyless sidecar.
  if (!fs.existsSync(path.join(aiDir, '.env'))) {
    writeLog(
      'WARNING: resources/ai-service/.env is missing — the sidecar will start ' +
        'without AI_SERVICE_API_KEY/INTERNAL_API_KEY and reject AI requests',
    );
  }
  const isScript = /\.(cmd|bat)$/i.test(executable);
  const env = {
    ...process.env,
    // Keep the persisted AI config in the user data folder — it is writable
    // regardless of where the app gets installed (e.g. Program Files).
    AI_CONFIG_FILE: path.join(app.getPath('userData'), 'ai_config.json'),
    // The SPA is staged beside the exe (frontend/dist) by the build script.
    AI_FRONTEND_DIR: path.join(aiDir, 'frontend', 'dist'),
    // The bundled ai-service ships with a dev BACKEND_API_URL (localhost:8000)
    // in its .env. Override it so auto-registration can reach the real backend.
    // Strip a trailing /api first: a user override that already includes it
    // would otherwise become /api/api and every /internal/ call would 404.
    BACKEND_API_URL: `${resolveBackendUrl().replace(/\/api$/i, '')}/api`,
  };
  // If the configured bundle port was busy, start the sidecar on the free port.
  if (bundlePortOverride) {
    env.AI_SERVICE_PORT = String(bundlePortOverride);
  }
  const child = spawn(executable, [], {
    cwd: aiDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: isScript,
    env,
  });
  child.on('error', (err) => writeLog(`Failed to spawn ai-service: ${err.message}`));
  child.unref();
  aiProcess = child;
  writeLog('Waiting for the AI service to come up...');
}

// The bundled AI service holds files inside the install directory (e.g.
// resources/ai-service under Program Files). If it outlives the app, the next
// installer cannot overwrite them and aborts with "Aeris cannot be closed
// during the installation". Kill the sidecar (and its children) on quit.
function stopAiService() {
  if (!aiProcess || !aiProcess.pid) return;
  const pid = aiProcess.pid;
  aiProcess = null;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true });
    } else {
      process.kill(pid);
    }
    writeLog(`Stopped bundled ai-service (pid ${pid})`);
  } catch (err) {
    writeLog(`Failed to stop bundled ai-service (pid ${pid}): ${err.message}`);
  }
}

// The bundled ai-service takes a while to load (YOLO + detection models), so a
// packaged window must retry connecting to the local origin before giving up.
const MAX_LOAD_ATTEMPTS = 60; // ~120s of retries
let loadAttempt = 0;
let loadRetryTimer = null;

function showBundleFailure() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showErrorBox(
    'Cannot Reach Local AI Bundle',
    `Aeris could not connect to:\n\n${resolveServerUrl()}\n\n` +
      'The bundled AI service (which serves the app and the /ai camera ' +
      'stream from this address) did not start. Restart Aeris; if the ' +
      'problem persists, run the AI service manually on this machine.\n' +
      'The address can be changed by editing "server-url.txt" in this folder:\n' +
      app.getPath('userData')
  );
  app.quit();
}

function scheduleLoadRetry(targetUrl) {
  if (loadAttempt >= MAX_LOAD_ATTEMPTS) {
    writeLog(`Giving up after ${MAX_LOAD_ATTEMPTS} load attempts`);
    showBundleFailure();
    return;
  }
  loadAttempt += 1;
  if (loadAttempt % 10 === 0) writeLog(`Retrying load (attempt ${loadAttempt}/${MAX_LOAD_ATTEMPTS})`);
  loadRetryTimer = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(targetUrl);
  }, 2000);
}

function createWindow() {
  const targetUrl = isDev ? DEV_FRONTEND_URL : resolveServerUrl();
  let allowedOrigin;
  try {
    allowedOrigin = new URL(targetUrl).origin;
  } catch (_) {
    allowedOrigin = targetUrl;
  }
  writeLog(`Loading ${targetUrl}`);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, 'icon.png'),
    show: false,
    // No native frame or menu bar: the renderer draws the 40px title strip
    // with minimize/maximize/close and the update button.
    frame: isMac,
    backgroundColor: '#1a1b1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const sendWindowState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state', { maximized: mainWindow.isMaximized() });
    }
  };
  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);

  mainWindow.loadURL(targetUrl);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    // Ignore aborted navigations (normal when SPA routes change)
    if (errorCode === -3) return;
    writeLog(`did-fail-load: "${validatedURL}" — ${errorDescription} (${errorCode})`);
    if (!isDev && mainWindow && !mainWindow.isDestroyed()) {
      scheduleLoadRetry(targetUrl);
    }
  });

  // Block ALL navigations away from the app origin (SPA handles routing internally)
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    try {
      if (new URL(navUrl).origin === allowedOrigin) return;
    } catch (_) {}
    writeLog(`Blocked navigation to: ${navUrl}`);
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    writeLog(`Blocked window.open: ${url}`);
    return { action: 'deny' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Aeris - Incident Detection');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show App', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); });
}

// Renderer asks for the backend origin (used to build absolute asset URLs).
ipcMain.on('get-server-url', (event) => {
  event.returnValue = isDev ? DEV_BACKEND_URL : resolveBackendUrl();
});

// Renderer asks for the AI service origin (RTSP frame polling, detection).
ipcMain.on('get-ai-url', (event) => {
  event.returnValue = isDev ? 'http://localhost:8005/ai' : resolveServerUrl() + '/ai';
});

// ── Auto-update ──────────────────────────────────────────────────────────────
// The app is a thin client: the UI it loads lives on the server, so most
// changes ship with a deploy. Only the Electron shell needs a new installer,
// which is what this checks for. Updates come from GitHub Releases (public
// repo), so the installed app holds no credentials — the token is only used by
// the release workflow when it uploads the build.
const UPDATE_CHANNEL_EVENTS = {
  checking: { status: 'checking' },
};

// Last status is cached so the title bar (which may mount after an early
// startup check) can sync instead of missing the event.
let lastUpdateStatus = { status: 'idle' };

function sendUpdateStatus(payload) {
  lastUpdateStatus = payload;
  writeLog(`update: ${payload.status}${payload.version ? ' ' + payload.version : ''}`);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-status', payload);
  }
}

function setupAutoUpdater() {
  if (isDev) return;

  // Check on demand (the Update button), download on request, and let a
  // downloaded update apply on the next normal quit if the user ignores it.
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (m) => writeLog(`updater: ${m}`),
    warn: (m) => writeLog(`updater: ${m}`),
    error: (m) => writeLog(`updater error: ${m}`),
    debug: () => {},
  };

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus(UPDATE_CHANNEL_EVENTS.checking);
  });
  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({ status: 'available', version: info.version });
  });
  autoUpdater.on('update-not-available', (info) => {
    sendUpdateStatus({ status: 'current', version: info.version });
  });
  autoUpdater.on('download-progress', (p) => {
    sendUpdateStatus({
      status: 'downloading',
      percent: Math.round(p.percent || 0),
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond,
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({ status: 'downloaded', version: info.version });
  });
  autoUpdater.on('error', (err) => {
    sendUpdateStatus({ status: 'error', message: err?.message || String(err) });
  });
}

// ── Window controls (custom title bar) ──────────────────────────────────────
ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

ipcMain.handle(
  'window:is-maximized',
  () => Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isMaximized())
);

ipcMain.handle('app-version', () => app.getVersion());

ipcMain.handle('update:check', async () => {
  if (isDev || !app.isPackaged) {
    return {
      ok: false,
      reason: 'dev',
      message: 'Update checks are only available in the installed app.',
    };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', message: err?.message || String(err) };
  }
});

ipcMain.handle('update:status', () => lastUpdateStatus);

ipcMain.handle('update:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'error', message: err?.message || String(err) };
  }
});

ipcMain.on('update:install', () => {
  // Stop the bundled AI sidecar first; quitAndInstall would otherwise leave it
  // holding the bundle port while the new version starts.
  app.isQuitting = true;
  stopAiService();
  autoUpdater.quitAndInstall(false, true);
});

app.whenReady().then(async () => {
  writeLog('App starting (bundled client)...');

  // The menu bar (File / Edit / View / Window) is replaced by the custom
  // title bar. macOS keeps its application menu for standard shortcuts.
  if (!isMac) Menu.setApplicationMenu(null);

  if (isDev) {
    createWindow();
    createTray();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
    return;
  }

  writeLog(`Backend URL: ${resolveBackendUrl()}`);

  // The bundled sidecar owns the bundle origin. If that port is already taken
  // (typically a leftover dev AI service pointing at a different backend),
  // silently reusing it would make every camera fail to register. Start the
  // sidecar on a free port instead and load the window from there.
  try {
    const base = resolveServerUrl();
    if (isLocalUrl(base)) {
      const desired = Number(new URL(base).port || 80);
      const free = await findFreePort(desired);
      if (free !== desired) {
        bundlePortOverride = free;
        writeLog(`Bundle port ${desired} busy; using ${free} for the sidecar`);
      }
    }
  } catch (err) {
    writeLog(`Port pre-flight check failed: ${err.message}`);
  }

  ensureAiServiceBundled();

  setupAutoUpdater();

  createWindow();
  createTray();

  // Quietly check once per launch so the title-bar update button can appear
  // without the user opening Settings. Failures stay in the log.
  setTimeout(() => {
    if (!app.isPackaged) return;
    autoUpdater
      .checkForUpdates()
      .catch((err) => writeLog(`Initial update check failed: ${err?.message || err}`));
  }, 5000);

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
});

app.on('before-quit', () => {
  writeLog('App quitting; stopping bundled ai-service sidecar');
  stopAiService();
});

app.on('window-all-closed', () => {
  if (loadRetryTimer) clearTimeout(loadRetryTimer);
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
