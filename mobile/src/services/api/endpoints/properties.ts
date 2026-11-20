// Properties API endpoints
import { apiClient } from '../client';

const IMMOBILIER_TYPES = 'immobilier_achat,immobilier_location,immobilier_terrain';

/** Types côté application (filtres, écrans de secteur) → valeurs `propertyType` de l'API. */
const TYPE_TO_API: Record<string, string> = {
  residence: 'residence', apartment: 'residence', villa: 'residence',
  hotel: 'hotel',
  restaurant: 'restaurant',
  immobilier: IMMOBILIER_TYPES, real_estate: IMMOBILIER_TYPES,
  immobilier_achat: 'immobilier_achat', immobilier_location: 'immobilier_location', immobilier_terrain: 'immobilier_terrain',
};

/**
 * L'API filtre sur `propertyType` (residence, hotel, immobilier_*, restaurant) ; l'application
 * utilise `type` (apartment, real_estate…). Sans cette conversion le filtre était ignoré.
 */
export function toApiSearchParams(params: Record<string, unknown>): Record<string, unknown> {
  const { type, ...rest } = params;
  if (typeof type !== 'string' || !type) return rest;
  const mapped = TYPE_TO_API[type];
  return mapped && rest.propertyType === undefined ? { ...rest, propertyType: mapped } : rest;
}

export const propertiesApi = {
  search: (params: Record<string, unknown>) => apiClient.get('/properties', { params: toApiSearchParams(params) }),
  getById: (id: string) => apiClient.get(`/properties/${id}`),
  getMyListings: (params?: Record<string, unknown>) => apiClient.get('/properties/my/listings', { params }),
  create: (data: Record<string, unknown>) => apiClient.post('/properties', data),
  update: (id: string, data: Record<string, unknown>) => apiClient.patch(`/properties/${id}`, data),
  delete: (id: string) => apiClient.delete(`/properties/${id}`),
  duplicate: (id: string) => apiClient.post(`/properties/${id}/duplicate`),
  publish: (id: string) => apiClient.post(`/properties/${id}/publish`),
  suspend: (id: string) => apiClient.post(`/properties/${id}/suspend`),

  // Scènes 3D : nom de pièce + hotspots de navigation inter-pièces
  list3dScenes: (id: string) => apiClient.get(`/properties/${id}/3d-scenes`),
  updateScene3d: (id: string, sceneId: string, data: {
    roomName?: string;
    hotspots?: Array<{ id?: string; targetSceneId: string; label?: string; theta: number; phi: number }>;
  }) => apiClient.patch(`/properties/${id}/3d-scenes/${sceneId}`, data),
  getStats: (id: string) => apiClient.get(`/properties/${id}/stats`),

  // Statistiques du professionnel : vue de la fiche / clic depuis une liste de résultats
  recordEvent: (id: string, type: 'view' | 'click', source?: string) =>
    apiClient.post(`/properties/${id}/events`, source ? { type, source } : { type }),

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

  // Type de média exclusif du bien (photos | video | threed).
  // Le backend purge les médias des autres types — demander confirmation avant.
  setMediaType: (id: string, mediaType: 'photos' | 'video' | 'threed') =>
    apiClient.put(`/properties/${id}/media-type`, { mediaType }),
};
