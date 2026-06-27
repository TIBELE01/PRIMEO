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

  // Restaurant unique du compte connecté (id auto-résolu côté serveur)
  getMyRestaurant: () => apiClient.get('/restaurant'),
  // Configuration du restaurant (ex : activation de la réservation de tables)
  updateMyRestaurant: (data: { tableReservationEnabled?: boolean }) =>
    apiClient.patch('/restaurant', data),
  // Menus du compte connecté (id auto-résolu) — vue gestion (tous statuts) / publique
  getMyMenuManage: () => apiClient.get('/restaurant/menu/all'),
  getMyMenu: () => apiClient.get('/restaurant/menu'),

  // Tables (gestion de salle : couverts, emplacement)
  getTables: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/tables`),
  createTable: (propertyId: string, data: {
    name: string;
    seats: number;
    location?: string;
    sortOrder?: number;
  }) => apiClient.post(`/properties/${propertyId}/tables`, data),
  updateTable: (propertyId: string, tableId: string, data: Partial<{
    name: string;
    seats: number;
    location: string;
    isActive: boolean;
    sortOrder: number;
  }>) => apiClient.patch(`/properties/${propertyId}/tables/${tableId}`, data),
  deleteTable: (propertyId: string, tableId: string) =>
    apiClient.delete(`/properties/${propertyId}/tables/${tableId}`),

  // Menu items (§8.4)
  // Vue client : plats validés (approved) uniquement.
  getMenuItems: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/menu`),
  // Vue gestion (pro) : tous les plats, incl. en attente de validation.
  getMenuItemsManage: (propertyId: string) =>
    apiClient.get(`/properties/${propertyId}/menu/all`),
  createMenuItem: (propertyId: string, data: {
    section: string;
    name: string;
    description?: string;
    price: number;
    allergens?: string[];
    isAvailable?: boolean;
    photoUrl?: string;
  }) => apiClient.post(`/properties/${propertyId}/menu`, data),
  updateMenuItem: (propertyId: string, itemId: string, data: Partial<{
    name: string;
    description: string;
    price: number;
    allergens: string[];
    isAvailable: boolean;
    sortOrder: number;
    photoUrl: string;
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
