import { apiClient } from '../client';

export const availabilitiesApi = {
  getCalendar: (propertyId: string, year: number, month: number) =>
    apiClient.get(`/availabilities/property/${propertyId}`, { params: { year, month } }),
  blockDates: (propertyId: string, startDate: string, endDate: string, reason?: string) =>
    apiClient.post(`/availabilities/property/${propertyId}/block`, { startDate, endDate, reason }),
  setAvailability: (propertyId: string, data: { startDate: string; endDate: string; isAvailable: boolean; price?: number }) =>
    apiClient.post(`/availabilities/property/${propertyId}`, data),
  exportIcal: (propertyId: string) =>
    apiClient.get(`/availabilities/property/${propertyId}/ical`, { responseType: 'text' }),
};
