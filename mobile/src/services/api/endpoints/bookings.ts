// Bookings API endpoints
import { apiClient } from '../client';

export const bookingsApi = {
  create: (data: Record<string, unknown>, idempotencyKey?: string) =>
    apiClient.post('/bookings', data, idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}),
  getById: (id: string) => apiClient.get(`/bookings/${id}`),
  getPaymentStatus: (id: string) => apiClient.get(`/bookings/${id}/payment-status`),
  getMyBookings: (params?: Record<string, unknown>) => apiClient.get('/bookings/me', { params }),
  cancel: (id: string, reason: string) => apiClient.post(`/bookings/${id}/cancel`, { reason }),
  confirm: (id: string) => apiClient.post(`/bookings/${id}/confirm`),
  complete: (id: string) => apiClient.post(`/bookings/${id}/complete`),
  getInvoice: (id: string) => apiClient.get(`/bookings/${id}/invoice`),
  markCashReceived: (id: string) => apiClient.post(`/bookings/${id}/cash-received`),
};
