import { apiClient } from '../client';

export interface StayCheck {
  available: boolean;
  checkIn: string;
  checkOut: string;
  nights: number;
  alternatives: { checkIn: string; checkOut: string }[];
}

/** Lien public d'abonnement iCal d'un bien (flux toujours à jour). */
export const icalFeedUrl = (propertyId: string) =>
  `${String(apiClient.defaults.baseURL ?? '').replace(/\/$/, '')}/availabilities/property/${propertyId}/ical`;

export const availabilitiesApi = {
  /** Le séjour est-il libre ? Sinon l'API propose jusqu'à 3 séjours de même durée. */
  checkStay: (propertyId: string, checkIn: string, checkOut: string) =>
    apiClient.get<StayCheck>(`/availabilities/property/${propertyId}/check`, { params: { checkIn, checkOut } }),
  getCalendar: (propertyId: string, year: number, month: number) =>
    apiClient.get(`/availabilities/property/${propertyId}`, { params: { year, month } }),
  blockDates: (propertyId: string, startDate: string, endDate: string, reason?: string) =>
    apiClient.post(`/availabilities/property/${propertyId}/block`, { startDate, endDate, reason }),
  setAvailability: (propertyId: string, data: { startDate: string; endDate: string; isAvailable: boolean; price?: number }) =>
    apiClient.post(`/availabilities/property/${propertyId}`, data),
  exportIcal: (propertyId: string) =>
    apiClient.get(`/availabilities/property/${propertyId}/ical`, { responseType: 'text' }),
  // Import iCal externe (Airbnb / Booking)
  listIcalFeeds: (propertyId: string) =>
    apiClient.get(`/availabilities/property/${propertyId}/ical-feeds`),
  addIcalFeed: (propertyId: string, url: string, source: string) =>
    apiClient.post(`/availabilities/property/${propertyId}/ical-feeds`, { url, source }),
  removeIcalFeed: (propertyId: string, feedId: string) =>
    apiClient.delete(`/availabilities/property/${propertyId}/ical-feeds/${feedId}`),
  syncIcalFeeds: (propertyId: string) =>
    apiClient.post(`/availabilities/property/${propertyId}/ical-feeds/sync`),
};
