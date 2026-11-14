const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Origin of the deployed backend (API/media) — resolved by main process.
  getBackendUrl: () => ipcRenderer.sendSync('get-server-url'),

  // The AI service lives on the same origin as the SPA: in the bundled
  // desktop product the ai-service serves both and exposes its API under /ai
  // (Vite dev server proxies /ai in development).
  getAiUrl: () => ipcRenderer.sendSync('get-ai-url'),

  // Absolute path of a File picked with <input type="file">. Browsers hide it
  // for privacy, but the bundled AI service runs on this machine and needs a
  // real path to open an MP4 source.
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file) || '';
    } catch (_) {
      return '';
    }
  },

  // Used by React to determine whether it's running in Electron
  isDesktop: true,

  platform: process.platform,

  minimize: () => {
    ipcRenderer.send('window-minimize');
  },

  // Toggles between maximized and restored.
  maximize: () => {
    ipcRenderer.send('window-maximize');
  },

  close: () => {
    ipcRenderer.send('window-close');
  },

  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),

  // Subscribe to maximize/restore events. Returns an unsubscribe function.
  onWindowStateChange: (callback) => {
    const handler = (_event, state) => callback(state);
    ipcRenderer.on('window-state', handler);
    return () => ipcRenderer.removeListener('window-state', handler);
  },

  openDevTools: () => {
    ipcRenderer.send('open-dev-tools');
  },

  onNotification: (callback) => {
    ipcRenderer.on('notification', (_event, data) => {
      callback(data);
    });
  },

  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', {
      title,
      body,
    });
  },

  // Installed app version, read from package.json by the main process.
  getVersion: () => ipcRenderer.invoke('app-version'),

  // Auto-update against GitHub Releases. The renderer never touches the feed
  // or a token; it only asks the main process to check/download/install.
  getUpdateStatus: () => ipcRenderer.invoke('update:status'),
  checkForUpdates: () => ipcRenderer.invoke('update:check'),
  downloadUpdate: () => ipcRenderer.invoke('update:download'),
  installUpdate: () => ipcRenderer.send('update:install'),

  // Subscribe to updater progress. Returns an unsubscribe function.
  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});