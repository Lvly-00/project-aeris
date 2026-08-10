import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refresh = localStorage.getItem('refresh_token');
        if (!refresh) throw new Error("No refresh token");

        // Use axios.post (not api.post) to avoid the interceptor
        const response = await axios.post('/api/auth/token/refresh/', { refresh });

        const newAccess = response.data.access;
        localStorage.setItem('access_token', newAccess);

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        return api(originalRequest);
      } catch (refreshErr) {
        // If refresh fails, the session is dead. Clear everything.
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { username: string; password: string }) =>
    api.post('/accounts/login/', data),
  logout: () =>
    api.post('/accounts/logout/'),
  verifyPassword: (password: string) =>
    api.post('/accounts/verify-password/', { password }),
  refresh: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
  register: (data: any) =>
    api.post('/accounts/register/', data),
  getProfile: () =>
    api.get('/accounts/me/'),
  updateProfile: (data: any) =>
    api.patch('/accounts/me/', data),
  getUsers: () =>
    api.get('/accounts/'),
  updateUser: (id: number, data: any) =>
    api.patch(`/accounts/${id}/`, data),
  deleteUser: (id: number) =>
    api.delete(`/accounts/${id}/`),
};

export const camerasAPI = {
  list: (params?: any) => api.get('/cameras/', { params }),
  get: (id: number) => api.get(`/cameras/${id}/`),
  create: (data: any) => api.post('/cameras/', data),
  update: (id: number, data: any) => api.put(`/cameras/${id}/`, data),
  delete: (id: number) => api.delete(`/cameras/${id}/`),
  updateStatus: (id: number, status: string) =>
    api.patch(`/cameras/${id}/status/`, { status }),
  snapshot: (id: number) => api.get(`/cameras/${id}/snapshot/`),
};

export const incidentsAPI = {
  list: (params?: any) => api.get('/incidents/', { params }),
  get: (id: number) => api.get(`/incidents/${id}/`),
  create: (data: FormData | any) => api.post('/incidents/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
  update: (id: number, data: any) => api.put(`/incidents/${id}/`, data),
  delete: (id: number) => api.delete(`/incidents/${id}/`),
  deleteAll: () => api.delete('/incidents/delete_all/'),
  statusTransition: (id: number, status: string) =>
    api.patch(`/incidents/${id}/status/`, { status }),
  dashboardStats: () => api.get('/incidents/dashboard-stats/'),
  createFromDetection: (data: any) => api.post('/incidents/create-from-detection/', data, {
    headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
  }),
};

export const detectionsAPI = {
  list: (params?: any) => api.get('/detections/', { params }),
  get: (id: number) => api.get(`/detections/${id}/`),
};

export const recommendationsAPI = {
  list: (params?: any) => api.get('/recommendations/', { params }),
  get: (id: number) => api.get(`/recommendations/${id}/`),
  accept: (id: number, data: { is_accepted: boolean }) =>
    api.post(`/recommendations/${id}/respond/`, data),
};

export const notificationsAPI = {
  list: (params?: any) => api.get('/notifications/', { params }),
  markRead: (id: number) => api.post(`/notifications/${id}/mark-read/`),
  markAllRead: () => api.post('/notifications/mark-all-read/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
};

export const reportsAPI = {
  list: () => api.get('/reports/'),
  get: (id: number) => api.get(`/reports/${id}/`),
  generate: (data: any) => api.post('/reports/generate/', data),
  downloadPdf: (id: number) => api.get(`/reports/${id}/download-pdf/`, {
    responseType: 'blob',
  }),
  downloadExcel: (id: number) => api.get(`/reports/${id}/download-excel/`, {
    responseType: 'blob',
  }),
};

export const analyticsAPI = {
  incidentSummary: () => api.get('/analytics/incident-summary/'),
  highRiskLocations: () => api.get('/analytics/high-risk-locations/'),
  peakHours: () => api.get('/analytics/peak-hours/'),
  responseTimes: () => api.get('/analytics/response-times/'),
  severityDistribution: () => api.get('/analytics/severity-distribution/'),
  trendAnalysis: (params?: any) => api.get('/analytics/trend-analysis/', { params }),
  heatmapData: () => api.get('/analytics/heatmap-data/'),
};

export const contactsAPI = {
  list: (params?: any) => api.get('/contacts/', { params }),
  get: (id: number) => api.get(`/contacts/${id}/`),
  create: (data: any) => api.post('/contacts/', data),
  update: (id: number, data: any) => api.put(`/contacts/${id}/`, data),
  delete: (id: number) => api.delete(`/contacts/${id}/`),
};

export const zonesAPI = {
  list: () => api.get('/zones/'),
  get: (id: number) => api.get(`/zones/${id}/`),
  create: (data: any) => api.post('/zones/', data),
  update: (id: number, data: any) => api.put(`/zones/${id}/`, data),
  delete: (id: number) => api.delete(`/zones/${id}/`),
};

export const dispatchAPI = {
  listDispatchers: (params?: any) => api.get('/dispatch/dispatchers/', { params }),
  getDispatcher: (id: number) => api.get(`/dispatch/dispatchers/${id}/`),
  createDispatcher: (data: any) => api.post('/dispatch/dispatchers/', data),
  updateDispatcher: (id: number, data: any) => api.patch(`/dispatch/dispatchers/${id}/`, data),
  listDispatches: (params?: any) => api.get('/dispatch/dispatches/', { params }),
  getDispatch: (id: number) => api.get(`/dispatch/dispatches/${id}/`),
  createDispatch: (data: any) => api.post('/dispatch/dispatches/', data),
  updateDispatchStatus: (id: number, status: string, notes?: string) =>
    api.patch(`/dispatch/dispatches/${id}/status/`, { status, notes }),
  cancelDispatch: (id: number, notes?: string) =>
    api.post(`/dispatch/dispatches/${id}/cancel/`, { notes }),
  getTimeline: (incidentId?: number) =>
    api.get('/dispatch/timeline/', { params: { incident: incidentId } }),
};

export const auditAPI = {
  list: (params?: any) => api.get('/audit/', { params }),
  recent: () => api.get('/audit/recent/'),
};

export const aiConfigAPI = {
  get: () => api.get('/ai-config/settings/'),
  update: (data: any) => api.patch('/ai-config/settings/', data),
};

// AI service client — moved to aiApi.ts.
// Re-exported here for backward compatibility with any existing imports.
export { aiAPI, aiHttp } from './aiApi';

export default api;
