// Referrals API endpoints
import { apiClient } from '../client';

export const referralsApi = {
  getCode: () => apiClient.get('/referrals/code'),
  getStats: () => apiClient.get('/referrals/stats'),
  listHistory: () => apiClient.get('/referrals/history'),
  listRewards: () => apiClient.get('/referrals/rewards'),
  // Ajout d'un code de parrainage après l'inscription (un seul ajout possible)
  applyCode: (code: string) => apiClient.post('/referrals/apply', { code }),
};
