import { apiClient } from '../client';

export interface PlatformStats {
  properties: number;
  cities: number;
  reservations: number;
  clients: number;
}

export const websiteApi = {
  getStats: () => apiClient.get<{ data: PlatformStats }>('/website/stats'),
};
