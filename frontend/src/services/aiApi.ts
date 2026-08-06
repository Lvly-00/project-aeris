/**
 * AI service client — communicates with the FastAPI AI service via the /ai/ proxy.
 *
 * The proxy is served by:
 *   - nginx (/ai/ → ai-service) in Docker
 *   - Vite dev server proxy in development
 *   - Django desktop mode for Electron
 *
 * The X-API-Key header value is intentionally a placeholder here —
 * the Django proxy injects the real server-side key before forwarding
 * (see config/urls/main.py §5.5). The frontend value only reaches nginx,
 * which sits in front of the AI service, never the service directly.
 */
import axios from 'axios';

const AI_BASE_URL = '/ai';

export const aiHttp = axios.create({
  baseURL: AI_BASE_URL,
  headers: { 'X-API-Key': 'ai-service-key' },
});

export const aiAPI = {
  health: () =>
    aiHttp.get('/health'),

  registerCamera: (data: { camera_id: number; source: string; stream_type?: string }) =>
    aiHttp.post('/cameras/register', data),

  deregisterCamera: (id: number) =>
    aiHttp.post(`/cameras/${id}/deregister`),

  listCameras: () =>
    aiHttp.get('/cameras'),

  getFrame: (id: number) =>
    aiHttp.get(`/cameras/${id}/frame`, { responseType: 'blob' }),

  detectOnCamera: (id: number) =>
    aiHttp.get(`/cameras/${id}/detect`),

  detectFrame: (file: File, camera_id?: number) => {
    const fd = new FormData();
    fd.append('file', file);
    if (camera_id !== undefined) fd.append('camera_id', String(camera_id));
    return aiHttp.post('/detect/frame', fd);
  },

  /** Returns the MJPEG stream URL for a camera (used as <video src> or <img src>). */
  getVideoStream: (id: number, _token?: string): string => {
    const aiBase = (window as any).electronAPI?.isDesktop
      ? (window as any).electronAPI.getAiUrl()
      : AI_BASE_URL;
    return `${aiBase}/stream/${id}/video`;
  },

  generateRecommendations: (data: any) =>
    aiHttp.post('/recommendations/generate', data),

  getConfig: () =>
    aiHttp.get('/config'),

  updateConfig: (data: any) =>
    aiHttp.post('/config', data),
};
