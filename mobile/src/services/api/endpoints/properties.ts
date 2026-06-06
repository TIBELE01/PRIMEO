// Properties API endpoints
import { apiClient } from '../client';

export const propertiesApi = {
  search: (params: Record<string, unknown>) => apiClient.get('/properties', { params }),
  getById: (id: string) => apiClient.get(`/properties/${id}`),
  getMyListings: (params?: Record<string, unknown>) => apiClient.get('/properties/my/listings', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/properties', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/properties/${id}`, data),
  delete: (id: string) => apiClient.delete(`/properties/${id}`),
  publish: (id: string) => apiClient.post(`/properties/${id}/publish`),
  suspend: (id: string) => apiClient.post(`/properties/${id}/suspend`),
  getStats: (id: string) => apiClient.get(`/properties/${id}/stats`),

  // Immobilier : exprimer son intérêt pour un bien (notifie le responsable)
  expressInterest: (id: string, message?: string) =>
    apiClient.post(`/properties/${id}/interest`, message ? { message } : {}),

  // Media — Cloudinary signed direct upload then persist the resulting URL
  signMediaUpload: (folder = 'properties') =>
    apiClient.get('/properties/media/sign', { params: { folder } }),
  addMedia: (id: string, data: {
    url: string; publicId: string;
    mediaType?: 'photo' | 'video' | 'virtual_tour_360';
    isPrimary?: boolean; sortOrder?: number;
  }) => apiClient.post(`/properties/${id}/media`, data),
  deleteMedia: (id: string, mediaId: string) =>
    apiClient.delete(`/properties/${id}/media/${mediaId}`),
};
