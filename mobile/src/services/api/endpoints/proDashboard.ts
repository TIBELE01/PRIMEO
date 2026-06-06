import { apiClient } from '../client';

export const proDashboardApi = {
  getBookingStats: (period?: string) =>
    apiClient.get('/analytics/bookings', { params: period ? { period } : undefined }),
  getPropertyStats: () => apiClient.get('/analytics/properties'),
  getDetailedStats: (params?: { period?: string; propertyId?: string }) =>
    apiClient.get('/analytics/detailed', { params }),
  getMyBookings: (params: Record<string, unknown>) => apiClient.get('/bookings', { params }),
};
