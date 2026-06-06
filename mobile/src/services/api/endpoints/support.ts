import { apiClient } from '../client';
import type { TicketCategory } from '../../../types/support';

export const supportApi = {
  createTicket: (data: { subject: string; description: string; category: TicketCategory }) =>
    apiClient.post('/support', data),
  getMyTickets: () => apiClient.get('/support/me'),
  getTicket:    (id: string) => apiClient.get(`/support/${id}`),
  addMessage:   (id: string, content: string) => apiClient.post(`/support/${id}/messages`, { content }),
};
