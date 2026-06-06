// Auth utilities: login, logout, session validation, 2FA
import { apiClient } from './api';
import Cookies from 'js-cookie';
import { STORAGE_KEYS } from './cookies';

const SESSION_DURATION_HOURS = Number(process.env.SESSION_DURATION_HOURS ?? 8);

export interface LoginPayload {
  email: string;
  password: string;
}

export interface TotpPayload {
  token: string;
  tempToken: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  accessToken?: string;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  admin?: AdminUser;
}

function persistToken(accessToken: string): void {
  const expires = SESSION_DURATION_HOURS / 24;
  Cookies.set(STORAGE_KEYS.ACCESS_TOKEN, accessToken, {
    expires,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

export const authService = {
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/admin/auth/login', payload);
    return data;
  },

  verifyTotp: async (payload: TotpPayload): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/admin/auth/totp/verify', payload);
    if (data.accessToken) {
      persistToken(data.accessToken);
    }
    return data;
  },

  logout: (): void => {
    Cookies.remove(STORAGE_KEYS.ACCESS_TOKEN);
    if (typeof window !== 'undefined') window.location.href = '/login';
  },

  getMe: async (): Promise<AdminUser | null> => {
    try {
      const { data } = await apiClient.get<AdminUser>('/admin/auth/me');
      return data;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return !!Cookies.get(STORAGE_KEYS.ACCESS_TOKEN);
  },

  persistToken,
};
