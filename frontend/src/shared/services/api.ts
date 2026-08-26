import axios from 'axios';
import {
  getAccessToken,
  getRefreshToken,
  persistAccessToken,
  clearTokens,
} from '../utils/tokenStorage';

const API_BASE_URL = '/api';

/** Public pages must never be hijacked by the expired-session redirect. */
const PUBLIC_AUTH_PATHS = [
  '/forgot-password',
  '/verification-code',
  '/reset-password',
];

function isPublicAuthPath(): boolean {
  const path = window.location.pathname;
  return (
    path.endsWith('/login') ||
    PUBLIC_AUTH_PATHS.some((prefix) => path.startsWith(prefix))
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Never send stale tokens to public auth endpoints — doing so can
    // cause DRF to attempt validation and return 401 even when the view
    // is set to authentication_classes=[].
    const url = (config.url ?? '').toLowerCase();
    const isPublicEndpoint =
      url.includes('/accounts/login/') ||
      url.includes('/accounts/password-reset/') ||
      url.includes('/accounts/register/') ||
      url.includes('/auth/token/');

    if (!isPublicEndpoint) {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const isLoginRequest =
      originalRequest?.url?.includes('/accounts/login/');

    const isRefreshRequest =
      originalRequest?.url?.includes('/auth/token/refresh/');

    /**
     * Login failed:
     *
     * 401 from /accounts/login/ means
     * incorrect email/password.
     *
     * DO NOT refresh.
     * DO NOT redirect.
     *
     * Let LoginPage handle the error.
     */
    if (isLoginRequest) {
      return Promise.reject(error);
    }

    /**
     * Refresh request itself failed.
     * The session is no longer valid — but if the user is on a public
     * page (login / password-reset flow) just drop the tokens and let
     * them continue; do NOT bounce them to login.
     */
    if (error.response?.status === 401 && isRefreshRequest) {
      clearTokens();

      if (!isPublicAuthPath()) {
        const isPwa = window.location.pathname.startsWith('/pwa');
        window.location.href = `${isPwa ? '/pwa/login' : '/desktop/login'}?expired=1`;
      }

      return Promise.reject(error);
    }

    /**
     * Normal authenticated request returned 401.
     * Try refreshing the access token.
     */
    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const refresh = getRefreshToken();

        if (!refresh) {
          throw new Error('No refresh token');
        }

        // Use plain axios to avoid interceptor loop.
        const response = await axios.post(
          '/api/auth/token/refresh/',
          {
            refresh,
          }
        );

        const newAccess = response.data.access;
        persistAccessToken(newAccess);

        originalRequest.headers.Authorization =
          `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearTokens();

        if (!isPublicAuthPath()) {
          const isPwa = window.location.pathname.startsWith('/pwa');
          window.location.href = `${isPwa ? '/pwa/login' : '/desktop/login'}?expired=1`;
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data: { email: string; password: string }) =>
    api.post('/accounts/login/', data),
  logout: () =>
    api.post('/accounts/logout/', { refresh: getRefreshToken() ?? undefined }),
  requestPasswordReset: (email: string) =>
    api.post('/accounts/password-reset/', { email }),
  verifyPasswordResetCode: (email: string, code: string) =>
    api.post('/accounts/password-reset/verify/', { email, code }),
  confirmPasswordReset: (email: string, code: string, password: string) =>
    api.post('/accounts/password-reset/confirm/', { email, code, password }),
  verifyPassword: (password: string) =>
    api.post('/accounts/verify-password/', { password }),
  refresh: (refresh: string) =>
    api.post('/auth/token/refresh/', { refresh }),
  register: (data: any) =>
    api.post('/accounts/register/', data),
  getProfile: () =>
    api.get('/accounts/me/'),
  updateProfile: (data: any) =>
    api.patch('/accounts/me/', data, {
      headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {},
    }),
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

export const notificationsAPI = {
  list: (params?: any) => api.get('/notifications/', { params }),
  markRead: (id: number) => api.post(`/notifications/${id}/mark-read/`),
  markAllRead: () => api.post('/notifications/mark-all-read/'),
  unreadCount: () => api.get('/notifications/unread_count/'),
};

export const analyticsAPI = {
  incidentSummary: () => api.get('/analytics/incident-summary/'),
  highRiskLocations: () => api.get('/analytics/high-risk-locations/'),
  peakHours: () => api.get('/analytics/peak-hours/'),
  responseTimes: () => api.get('/analytics/response-times/'),
  severityDistribution: () => api.get('/analytics/severity-distribution/'),
  trendAnalysis: (params?: any) => api.get('/analytics/trend-analysis/', { params }),
};

export const contactsAPI = {
  list: (params?: any) => api.get('/contacts/', { params }),
  get: (id: number) => api.get(`/contacts/${id}/`),
  create: (data: any) => api.post('/contacts/', data),
  update: (id: number, data: any) => api.put(`/contacts/${id}/`, data),
  delete: (id: number) => api.delete(`/contacts/${id}/`),
};

export const dispatchAPI = {
  getTimeline: (incidentId?: number) =>
    api.get('/dispatch/timeline/', { params: { incident: incidentId } }),
};

export const dispatchMessagesAPI = {
  list: (params?: any) => api.get('/dispatch/messages/', { params }),
  get: (id: number) => api.get(`/dispatch/messages/${id}/`),
  markRead: (id: number) => api.post(`/dispatch/messages/${id}/mark-read/`),
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
