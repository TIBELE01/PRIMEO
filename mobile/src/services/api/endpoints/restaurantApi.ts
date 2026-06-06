import { apiClient } from '../client';

export const restaurantApi = {
  // Time slots (§8.3)
  getTimeSlots: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/time-slots`),
  createTimeSlot: (propertyId: string, data: {
    dayOfWeek: number; // 0=Mon…6=Sun
    startTime: string; // "HH:MM"
    endTime: string;
    maxCapacity: number;
    isBlocked?: boolean;
  }) => apiClient.post(`/properties/${propertyId}/time-slots`, data),
  updateTimeSlot: (propertyId: string, slotId: string, data: Partial<{
    maxCapacity: number;
    isBlocked: boolean;
  }>) => apiClient.patch(`/properties/${propertyId}/time-slots/${slotId}`, data),
  deleteTimeSlot: (propertyId: string, slotId: string) =>
    apiClient.delete(`/properties/${propertyId}/time-slots/${slotId}`),

  // Menu items (§8.4)
  getMenuItems: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/menu`),
  createMenuItem: (propertyId: string, data: {
    section: string;
    name: string;
    description?: string;
    price: number;
    allergens?: string[];
    isAvailable?: boolean;
  }) => apiClient.post(`/properties/${propertyId}/menu`, data),
  updateMenuItem: (propertyId: string, itemId: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    allergens: string[];
    isAvailable: boolean;
    sortOrder: number;
  }>) => apiClient.patch(`/properties/${propertyId}/menu/${itemId}`, data),
  deleteMenuItem: (propertyId: string, itemId: string) =>
    apiClient.delete(`/properties/${propertyId}/menu/${itemId}`),

  // Special menus (§8.4)
  getSpecialMenus: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/special-menus`),
  createSpecialMenu: (propertyId: string, data: {
    name: string;
    description?: string;
    date: string; // YYYY-MM-DD
    pricePerPerson: number;
  }) => apiClient.post(`/properties/${propertyId}/special-menus`, data),
  deleteSpecialMenu: (propertyId: string, menuId: string) =>
    apiClient.delete(`/properties/${propertyId}/special-menus/${menuId}`),

  // No-show (§8.5)
  markNoShow: (bookingId: string) =>
    apiClient.post(`/bookings/${bookingId}/no-show`),

  // Promotions (§8.8)
  getPromotions: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/promotions`),
  createPromotion: (propertyId: string, data: {
    title: string;
    description?: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    validUntil?: string;
  }) => apiClient.post(`/properties/${propertyId}/promotions`, data),
  deletePromotion: (propertyId: string, promoId: string) =>
    apiClient.delete(`/properties/${propertyId}/promotions/${promoId}`),
};
