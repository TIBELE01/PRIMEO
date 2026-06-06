// Payments API endpoints
import { apiClient } from '../client';

export const paymentsApi = {
  initiate: (bookingId: string) => apiClient.post('/payments/initiate', { bookingId }),
  getStatus: (transactionId: string) => apiClient.get(`/payments/status/${transactionId}`),
  listTransactions: (params?: Record<string, unknown>) => apiClient.get('/payments/transactions', { params }),
};
