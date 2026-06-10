// Auth API endpoints
import { apiClient } from '../client';

export const authApi = {
  register: (data: Record<string, unknown>) => apiClient.post('/auth/register', data),
  verifyPhone: (phone: string, otp: string) => apiClient.post('/auth/verify-phone', { phone, otp }),
  resendOtp: (phone: string) => apiClient.post('/auth/resend-otp', { phone }),
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  google: (accessToken: string, refreshToken: string) => apiClient.post('/auth/google', { accessToken, refreshToken }),
  verifyTotp: (userId: string, token: string) => apiClient.post('/auth/verify-totp', { userId, token }),
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
  logout: () => apiClient.post('/auth/logout'),
  forgotPassword: (email: string) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => apiClient.post('/auth/reset-password', { token, password }),
  setup2fa: () => apiClient.post('/auth/2fa/setup'),
  verify2fa: (data: { token: string }) => apiClient.post('/auth/2fa/verify', data),
  disable2fa: (data: { token: string }) => apiClient.post('/auth/2fa/disable', data),
};
