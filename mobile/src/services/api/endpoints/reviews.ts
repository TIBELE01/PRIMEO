// Reviews API endpoints
import { apiClient } from '../client';

export const reviewsApi = {
  create: (data: Record<string, unknown>) => apiClient.post('/reviews', data),
  update: (reviewId: string, data: Record<string, unknown>) => apiClient.patch(`/reviews/${reviewId}`, data),
  deleteReview: (reviewId: string) => apiClient.delete(`/reviews/${reviewId}`),
  listMine: () => apiClient.get('/reviews/mine'),
  getForProperty: (propertyId: string, params?: Record<string, unknown>) => apiClient.get(`/reviews/property/${propertyId}`, { params }),
  replyToReview: (reviewId: string, reply: string) => apiClient.post(`/reviews/${reviewId}/reply`, { reply }),
  uploadMedia: (reviewId: string, file: { uri: string; name: string; type: string }) => {
    const form = new FormData();
    form.append('file', file as any);
    return apiClient.post(`/reviews/${reviewId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteMedia: (reviewId: string, mediaId: string) => apiClient.delete(`/reviews/${reviewId}/media/${mediaId}`),
};
