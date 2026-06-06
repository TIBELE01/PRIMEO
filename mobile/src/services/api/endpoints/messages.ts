// Messages API endpoints
import { apiClient } from '../client';

export const messagesApi = {
  listConversations: () => apiClient.get('/messages/conversations'),
  getConversation: (bookingId: string) => apiClient.get(`/messages/booking/${bookingId}`),
  markAsRead: (bookingId: string) => apiClient.post(`/messages/booking/${bookingId}/read`),
  reportMessage: (messageId: string, reason: string) => apiClient.post(`/messages/${messageId}/report`, { reason }),
};
