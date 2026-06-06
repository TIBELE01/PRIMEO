// Users API endpoints — profil, mot de passe, compte
import { apiClient } from '../client';

export const usersApi = {
  getProfile:     ()                                    => apiClient.get('/users/me'),
  updateProfile:  (data: Record<string, unknown>)       => apiClient.patch('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => apiClient.patch('/users/me/password', data),
  deactivate:     (data: { duration: string; reason?: string }) => apiClient.post('/users/me/deactivate', data),
  reactivate:     ()                                    => apiClient.post('/users/me/reactivate', {}),
  deleteAccount:  (data: { password: string; reason?: string }) => apiClient.delete('/users/me', { data }),
  setup2fa:       ()                                    => apiClient.post('/users/me/2fa/setup', {}),
  confirm2fa:     (token: string)                       => apiClient.post('/users/me/2fa/confirm', { token }),
  disable2fa:     ()                                    => apiClient.delete('/users/me/2fa'),
};
