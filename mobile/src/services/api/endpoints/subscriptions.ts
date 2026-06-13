// Subscriptions API endpoints
import { apiClient } from '../client';

export const subscriptionsApi = {
  getPlans: () => apiClient.get('/subscriptions/plans'),
  getMySubscription: () => apiClient.get('/subscriptions/me'),
  upgrade: (plan: string) => apiClient.post('/subscriptions/upgrade', { plan }),
  cancel: () => apiClient.post('/subscriptions/cancel'),
  listInvoices: () => apiClient.get('/subscriptions/invoices'),
  // Publications supplémentaires (500 FCFA/slot/mois)
  getSlots: () => apiClient.get('/subscriptions/slots'),
  purchaseSlots: (quantity: number) => apiClient.post('/subscriptions/slots/purchase', { quantity }),
  cancelSlots: (quantity: number) => apiClient.post('/subscriptions/slots/cancel', { quantity }),
};
