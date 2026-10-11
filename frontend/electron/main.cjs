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
const { spawn, spawnSync } = require('child_process');

const isDev = !app.isPackaged;

const DEV_FRONTEND_URL = 'http://localhost:5173';
const DEV_BACKEND_URL = 'http://localhost:8000';
const DEFAULT_BUNDLE_URL = 'http://localhost:8005';
const DEFAULT_BACKEND_URL = 'https://project-aeris.onrender.com';

let mainWindow = null;
let tray = null;
let aiProcess = null;

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
  return url.replace(/\/+$/, '');
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
  const isScript = /\.(cmd|bat)$/i.test(executable);
  const child = spawn(executable, [], {
    cwd: aiDir,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    shell: isScript,
    env: {
      ...process.env,
      // Keep the persisted AI config in the user data folder — it is writable
      // regardless of where the app gets installed (e.g. Program Files).
      AI_CONFIG_FILE: path.join(app.getPath('userData'), 'ai_config.json'),
      // The SPA is staged beside the exe (frontend/dist) by the build script.
      AI_FRONTEND_DIR: path.join(aiDir, 'frontend', 'dist'),
    },
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
    backgroundColor: '#1a1b1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

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

app.whenReady().then(() => {
  writeLog('App starting (bundled client)...');

  if (isDev) {
    createWindow();
    createTray();
    app.on('activate', () => {
      if (mainWindow === null) createWindow();
    });
    return;
  }

  writeLog(`Backend URL: ${resolveBackendUrl()}`);
  ensureAiServiceBundled();

  createWindow();
  createTray();

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
