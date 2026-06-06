// Users API endpoints
import { apiClient } from '../client';

export const usersApi = {
  getProfile: () => apiClient.get('/users/me'),
  updateProfile: (data: Record<string, unknown>) => apiClient.patch('/users/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => apiClient.patch('/users/me/password', data),
  deleteAccount: () => apiClient.delete('/users/me'),
};
