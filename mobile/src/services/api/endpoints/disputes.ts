// Disputes API endpoints
import { apiClient } from '../client';

export const disputesApi = {
  create: (data: { bookingId: string; reason: string; description: string }) =>
    apiClient.post('/disputes', data),
  getById: (id: string) => apiClient.get(`/disputes/${id}`),
  getMyDisputes: () => apiClient.get('/disputes/me'),
  getMessages: (id: string) => apiClient.get(`/disputes/${id}/messages`),
  sendMessage: (id: string, content: string) => apiClient.post(`/disputes/${id}/messages`, { content }),
};
