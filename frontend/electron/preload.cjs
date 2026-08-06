const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBackendUrl: () => 'http://localhost:8000',
  getAiUrl: () => 'http://localhost:8005',
  isDesktop: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  openDevTools: () => ipcRenderer.send('open-dev-tools'),
  onNotification: (callback) => {
    ipcRenderer.on('notification', (_event, data) => callback(data));
  },
  showNotification: (title, body) => {
    ipcRenderer.send('show-notification', { title, body });
  },
});
