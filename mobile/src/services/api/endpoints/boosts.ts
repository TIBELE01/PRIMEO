// Boosts API endpoints
import { apiClient } from '../client';

export const boostsApi = {
  getBalance: () => apiClient.get('/boosts/balance'),
  getMyBoosts: () => apiClient.get('/boosts/me'),
  create: (propertyId: string, type: 'paid' | 'free') => apiClient.post('/boosts', { propertyId, type }),
};
