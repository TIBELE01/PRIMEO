// Favorites API endpoints
import { apiClient } from '../client';

export const favoritesApi = {
  list: () => apiClient.get('/favorites'),
  add: (propertyId: string) => apiClient.post(`/favorites/${propertyId}`),
  remove: (propertyId: string) => apiClient.delete(`/favorites/${propertyId}`),

  // ── Favorite Lists ──────────────────────────────────────────────────────────
  listLists: () => apiClient.get('/favorites/lists'),
  createList: (name: string) => apiClient.post('/favorites/lists', { name }),
  deleteList: (listId: string) => apiClient.delete(`/favorites/lists/${listId}`),
  addItemToList: (listId: string, propertyId: string) => apiClient.post(`/favorites/lists/${listId}/items`, { propertyId }),
  removeItemFromList: (listId: string, propertyId: string) => apiClient.delete(`/favorites/lists/${listId}/items/${propertyId}`),
  syncList: (listId: string, propertyIds: string[]) => apiClient.put(`/favorites/lists/${listId}/sync`, { propertyIds }),
  listItems: (listId: string) => apiClient.get(`/favorites/lists/${listId}/items`),
};
