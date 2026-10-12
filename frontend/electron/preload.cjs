const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Origin of the deployed backend (API/media) — resolved by main process.
  getBackendUrl: () => ipcRenderer.sendSync('get-server-url'),

  // The AI service lives on the same origin as the SPA: in the bundled
  // desktop product the ai-service serves both and exposes its API under /ai
  // (Vite dev server proxies /ai in development).
  getAiUrl: () => ipcRenderer.sendSync('get-ai-url'),

  // Used by React to determine whether it's running in Electron
  isDesktop: true,

  platform: process.platform,

  minimize: () => {
    ipcRenderer.send('window-minimize');
  },

  maximize: () => {
    ipcRenderer.send('window-maximize');
  },

  close: () => {
    ipcRenderer.send('window-close');
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
});