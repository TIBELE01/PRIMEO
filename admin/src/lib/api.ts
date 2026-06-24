// Shared Axios client for admin dashboard — attaches JWT from cookie on every request
import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from './cookies';

// Base API normalisée : se termine TOUJOURS par /api, que NEXT_PUBLIC_API_URL
// inclue déjà le suffixe ou non (ex. https://primeo-api.onrender.com → .../api).
// Corrige le 404 « Cannot POST /admin/auth/login » quand l'URL Render omet /api.
export function normalizeApiBase(raw?: string | null): string {
  return (raw ?? 'http://localhost:4000')
    .replace(/\/+$/, '')
    .replace(/\/api$/, '')
    + '/api';
}

export const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

// 65 s : couvre le cold-start de Render free tier (jusqu'à 60 s) avec marge
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 65_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token on every outgoing request
apiClient.interceptors.request.use(config => {
  const token = Cookies.get(STORAGE_KEYS.ACCESS_TOKEN);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove(STORAGE_KEYS.ACCESS_TOKEN);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dérouler l'enveloppe { data: payload } — sauf pour les réponses paginées
// qui contiennent 'total' / 'pages' / 'page' en plus de 'data'
function unwrap<T>(body: unknown): T {
  if (
    body &&
    typeof body === 'object' &&
    !Array.isArray(body) &&
    'data' in (body as object) &&
    !('total'  in (body as object)) &&
    !('page'   in (body as object)) &&
    !('pages'  in (body as object))
  ) {
    return (body as { data: T }).data as T;
  }
  return body as T;
}

// Convenience wrappers — auto-extract .data or bare payload so callers get the payload directly
export const api = {
  get: <T = unknown>(url: string, params?: object) =>
    apiClient.get(url, { params }).then(r => unwrap<T>(r.data)),
  post: <T = unknown>(url: string, body?: unknown) =>
    apiClient.post(url, body).then(r => unwrap<T>(r.data)),
  put: <T = unknown>(url: string, body?: unknown) =>
    apiClient.put(url, body).then(r => unwrap<T>(r.data)),
  patch: <T = unknown>(url: string, body?: unknown) =>
    apiClient.patch(url, body).then(r => unwrap<T>(r.data)),
  delete: <T = unknown>(url: string) =>
    apiClient.delete(url).then(r => unwrap<T>(r.data)),
  uploadFile: <T = unknown>(url: string, formData: FormData) =>
    apiClient.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => unwrap<T>(r.data)),
};
