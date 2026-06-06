// Referrals API endpoints
import { apiClient } from '../client';

export const referralsApi = {
  getCode: () => apiClient.get('/referrals/code'),
  getStats: () => apiClient.get('/referrals/stats'),
  listHistory: () => apiClient.get('/referrals/history'),
  listRewards: () => apiClient.get('/referrals/rewards'),
};
