// Reviews API endpoints
import { apiClient } from '../client';

export const reviewsApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/reviews', data),
  update: (reviewId: string, data: Record<string, unknown>) => apiClient.patch(`/reviews/${reviewId}`, data),
  deleteReview: (reviewId: string) => apiClient.delete(`/reviews/${reviewId}`),
  listMine: () => apiClient.get('/reviews/mine'),
  getForProperty: (propertyId: string, params?: Record<string, unknown>) => apiClient.get(`/reviews/property/${propertyId}`, { params }),
  replyToReview: (reviewId: string, reply: string) => apiClient.post(`/reviews/${reviewId}/reply`, { reply }),
};
