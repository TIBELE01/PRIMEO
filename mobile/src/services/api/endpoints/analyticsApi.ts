import { apiClient } from '../client';

export const analyticsApi = {
  getDetailedStats: (params?: { period?: string; propertyId?: string }) =>
    apiClient.get('/analytics/detailed', { params }),
  getPropertyStats: () => apiClient.get('/analytics/properties'),
  getBookingStats: (params?: { period?: string }) =>
    apiClient.get('/analytics/bookings', { params }),
  getOccupancyRate: (params?: { period?: string }) =>
    apiClient.get('/analytics/occupancy', { params }),
};
