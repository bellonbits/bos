import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        await SecureStore.setItemAsync('access_token', data.access_token);
        apiClient.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch {
        await clearTokens();
        // Navigate to login — handled by the auth store observer
      }
    }
    return Promise.reject(error);
  }
);

export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync('access_token', accessToken),
    SecureStore.setItemAsync('refresh_token', refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync('access_token'),
    SecureStore.deleteItemAsync('refresh_token'),
  ]);
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

export const AuthAPI = {
  register: (data: { email: string; password: string; name: string; phone?: string }) =>
    apiClient.post<TokenResponse>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<TokenResponse>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken }),
};

// ─── Business endpoints ───────────────────────────────────────────────────────

export const BusinessAPI = {
  create: (data: { name: string; business_type: string; phone?: string; location?: string }) =>
    apiClient.post('/businesses', data),

  get: (id: string) => apiClient.get(`/businesses/${id}`),
};

// ─── Analytics endpoints ──────────────────────────────────────────────────────

export const AnalyticsAPI = {
  daily: (businessId: string, date: string) =>
    apiClient.get(`/analytics/${businessId}/daily`, { params: { date } }),

  weekly: (businessId: string) =>
    apiClient.get(`/analytics/${businessId}/weekly`),

  monthly: (businessId: string, month: string) =>
    apiClient.get(`/analytics/${businessId}/monthly`, { params: { month } }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}
