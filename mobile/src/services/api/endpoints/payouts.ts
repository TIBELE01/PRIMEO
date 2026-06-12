// Payouts API — historique et synthèse des reversements du professionnel
import { apiClient } from '../client';

export const payoutsApi = {
  list: (page = 1, limit = 20) => apiClient.get('/payouts/me', { params: { page, limit } }),
  getSummary: () => apiClient.get('/payouts/me/summary'),
};
