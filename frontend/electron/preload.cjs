const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Origin of the deployed backend (thin client — resolved by main process).
  getBackendUrl: () => ipcRenderer.sendSync('get-server-url'),

  // The AI service is reached through the same-origin /ai proxy
  // (Vite dev server in development, nginx on the deployed server).
  getAiUrl: () => '/ai',

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