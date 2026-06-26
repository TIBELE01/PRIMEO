// Axios instance — JWT injection, queue-based 401 refresh, automatic logout on failure
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../constants/config';
import { STORAGE_KEYS } from '../../constants/storageKeys';

// Deferred import: we resolve useAuthStore at call time to avoid circular deps
// (authStore → axios is fine; we only go the other way via .getState())
const getAuthStore = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('../../store/authStore') as typeof import('../../store/authStore')).useAuthStore;

// ── Axios instance ────────────────────────────────────────────────────────────

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  // 45 s : le backend (offre gratuite Render) peut mettre 30-50 s à redémarrer
  // après une période d'inactivité (cold start). Un timeout trop court faisait
  // échouer le 1er appel et affichait à tort l'onboarding « Créer mon restaurant ».
  timeout: 45_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor — attach access token ─────────────────────────────────

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

// ── Response interceptor — queue-based 401 refresh ───────────────────────────

type QueueItem = { resolve: (token: string) => void; reject: (err: unknown) => void };

let isRefreshing = false;
let failedQueue: QueueItem[] = [];

function processQueue(error: unknown, token: string | null): void {
  for (const item of failedQueue) {
    if (error) item.reject(error);
    else if (token) item.resolve(token);
  }
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    // Mode maintenance : le backend renvoie 503 { error: 'maintenance', ... }
    // → bascule l'app entière sur l'écran de maintenance (rendu dans App.tsx)
    if (error.response?.status === 503 && (error.response.data as { error?: string })?.error === 'maintenance') {
      const body = error.response.data as { message?: string; estimatedEnd?: string | null };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      (require('../../store/maintenanceStore') as typeof import('../../store/maintenanceStore'))
        .useMaintenanceStore.getState().activate(body.message ?? null, body.estimatedEnd ?? null);
      return Promise.reject(error);
    }

    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // A refresh is already in-flight — queue this request and wait
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers!['Authorization'] = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const storedRefresh = await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_URL}/api/auth/refresh`,
        { refreshToken: storedRefresh },
      );

      // Persist new tokens
      await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, data.accessToken);
      await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);

      // Sync Zustand store without triggering re-render if not needed
      getAuthStore().getState().setTokens(data.accessToken, data.refreshToken);

      processQueue(null, data.accessToken);
      original.headers!['Authorization'] = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Refresh failed — full logout
      await getAuthStore().getState().logout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
