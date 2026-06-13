// Tests du service Favoris — vérifie les bons endpoints/méthodes HTTP.
jest.mock('@/services/api/client', () => ({
  apiClient: {
    get: jest.fn(async () => ({ data: { data: [] } })),
    post: jest.fn(async () => ({ data: { ok: true } })),
    delete: jest.fn(async () => ({ data: { ok: true } })),
  },
}));

import { favoritesApi } from '@/services/api/endpoints/favorites';
import { apiClient } from '@/services/api/client';

describe('favoritesApi', () => {
  afterEach(() => jest.clearAllMocks());

  it('list() → GET /favorites', async () => {
    await favoritesApi.list();
    expect(apiClient.get).toHaveBeenCalledWith('/favorites');
  });

  it('add(id) → POST /favorites/:id', async () => {
    await favoritesApi.add('prop-42');
    expect(apiClient.post).toHaveBeenCalledWith('/favorites/prop-42');
  });

  it('remove(id) → DELETE /favorites/:id', async () => {
    await favoritesApi.remove('prop-42');
    expect(apiClient.delete).toHaveBeenCalledWith('/favorites/prop-42');
  });
});
