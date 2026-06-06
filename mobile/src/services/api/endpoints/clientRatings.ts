// Client ratings API endpoints (reciprocal evaluation)
import { apiClient } from '../client';

export const clientRatingsApi = {
  // Client-side: see ratings received from professionals
  listReceived: () => apiClient.get('/client-ratings/received'),
  report: (ratingId: string, reason: string) => apiClient.post(`/client-ratings/${ratingId}/report`, { reason }),

  // Pro-side: rate a client after a completed stay
  create: (data: {
    bookingId: string;
    respectRating: number;
    communicationRating: number;
    punctualityRating: number;
    rulesRating: number;
    comment?: string;
    isPublic?: boolean;
  }) => apiClient.post('/client-ratings', data),
  listGiven: () => apiClient.get('/client-ratings/given'),
  getClientAggregate: (clientId: string) => apiClient.get(`/client-ratings/client/${clientId}`),
  canRate: (bookingId: string) => apiClient.get(`/client-ratings/can-rate/${bookingId}`),
};
