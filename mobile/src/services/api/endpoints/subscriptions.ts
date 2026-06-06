// Subscriptions API endpoints
import { apiClient } from '../client';

export const subscriptionsApi = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  getMySubscription: () => apiClient.get('/subscriptions/me'),
  upgrade: (plan: string) => apiClient.post('/subscriptions/upgrade', { plan }),
  cancel: () => apiClient.post('/subscriptions/cancel'),
  listInvoices: () => apiClient.get('/subscriptions/invoices'),
};
