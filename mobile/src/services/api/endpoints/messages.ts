// Messages API endpoints
import { apiClient } from '../client';

export const messagesApi = {
  listConversations: () => apiClient.get('/messages/conversations'),
  getConversation: (bookingId: string) => apiClient.get(`/messages/booking/${bookingId}`),
  markAsRead: (bookingId: string) => apiClient.post(`/messages/booking/${bookingId}/read`),
  reportMessage: (messageId: string, reason: string) => apiClient.post(`/messages/${messageId}/report`, { reason }),
  // Réponses rapides (templates) : génériques (clients) / CRUD (pros)
  listTemplates: () => apiClient.get('/messages/templates'),
  createTemplate: (label: string, content: string) => apiClient.post('/messages/templates', { label, content }),
  updateTemplate: (id: string, data: { label?: string; content?: string }) => apiClient.put(`/messages/templates/${id}`, data),
  deleteTemplate: (id: string) => apiClient.delete(`/messages/templates/${id}`),
};
