/**
 * Aeris Desktop — THIN CLIENT
 *
 * The desktop app no longer bundles/launches Django, SQLite, or the AI
 * service. Those run centrally on the deployed server. This process just
 * opens a window pointing at the deployed web frontend, which serves the
 * API (/api), WebSocket (/ws) and AI proxy (/ai) on the same origin.
 *
 * Server URL resolution order:
 *   1. AERIS_SERVER_URL environment variable
 *   2. server-url.txt inside the user data folder (one line, e.g.
 *      "https://aeris.example.com") — editable by support without reinstalling
 *   3. Default: http://localhost:8000 (local development backend)
 *
 * Development mode (`npm run dev:desktop`) loads the Vite dev server, whose
 * proxies forward /api, /ws and /ai to localhost services.
 */

const { app, BrowserWindow, Tray, Menu, nativeImage, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

const DEV_FRONTEND_URL = 'http://localhost:5173';
const DEV_BACKEND_URL = 'http://localhost:8000';
const DEFAULT_SERVER_URL = 'http://localhost:8000';

let mainWindow = null;
let tray = null;

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

  if (!url) url = DEFAULT_SERVER_URL;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
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
      dialog.showErrorBox(
        'Cannot Reach Server',
        `Aeris could not connect to:\n\n${resolveServerUrl()}\n\n` +
          'Check your internet connection, or make sure the server address is correct.\n' +
          'The address can be changed by editing "server-url.txt" in this folder:\n' +
          app.getPath('userData')
      );
      app.quit();
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
  event.returnValue = isDev ? DEV_BACKEND_URL : resolveServerUrl();
});

app.whenReady().then(() => {
  writeLog('App starting (thin client)...');

  if (!isDev) {
    writeLog(`Server URL: ${resolveServerUrl()}`);
  }

  createWindow();
  createTray();

  app.on('activate', () => {
    if (mainWindow === null) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
