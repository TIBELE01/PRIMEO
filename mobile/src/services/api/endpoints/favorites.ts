// Favorites API endpoints
import { apiClient } from '../client';

export const favoritesApi = {
  list: () => apiClient.get('/favorites'),
  add: (propertyId: string) => apiClient.post(`/favorites/${propertyId}`),
  remove: (propertyId: string) => apiClient.delete(`/favorites/${propertyId}`),
};
