import { apiClient } from '../client';

export const notificationsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/notifications', { params }),

  markRead: (id: string) =>
    apiClient.post(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.post('/notifications/read-all'),

  getPreferences: () =>
    apiClient.get('/notifications/preferences'),

  updatePreferences: (prefs: { email?: boolean; push?: boolean; sms?: boolean }) =>
    apiClient.patch('/notifications/preferences', prefs),

  registerPushToken: (token: string, platform?: 'ios' | 'android') =>
    apiClient.post('/notifications/push-token', { token, platform }),
};
