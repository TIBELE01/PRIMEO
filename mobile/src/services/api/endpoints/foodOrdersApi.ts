import { apiClient } from '../client';

export type FoodOrderDeliveryType = 'dine_in' | 'takeaway' | 'delivery';
export type FoodOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface FoodOrderItem {
  id: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  notes?: string;
  menuItem: { name: string; section: string; photoUrl?: string };
}

export interface FoodOrder {
  id: string;
  propertyId: string;
  clientId: string;
  totalAmount: number;
  specialInstructions?: string;
  status: FoodOrderStatus;
  deliveryType: FoodOrderDeliveryType;
  deliveryAddress?: string;
  estimatedMinutes?: number;
  orderedAt: string;
  confirmedAt?: string;
  readyAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  items: FoodOrderItem[];
  client?: { firstName: string; lastName: string; phone: string; avatarUrl?: string };
  property?: { id: string; title: string };
}

export interface CartItem {
  menuItemId: string;
  name: string;
  section: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  photoUrl?: string;
}

export const foodOrdersApi = {
  create: (data: {
    propertyId: string;
    items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    deliveryType: FoodOrderDeliveryType;
    deliveryAddress?: string;
    specialInstructions?: string;
  }) => apiClient.post<{ data: FoodOrder }>('/food-orders', data),

  getMyOrders: (params?: { status?: FoodOrderStatus; propertyId?: string }) =>
    apiClient.get<{ data: FoodOrder[] }>('/food-orders/mine', { params }),

  getById: (orderId: string) =>
    apiClient.get<{ data: FoodOrder }>(`/food-orders/${orderId}`),

  cancelOrder: (orderId: string, reason?: string) =>
    apiClient.post<{ data: FoodOrder }>(`/food-orders/${orderId}/cancel`, { reason }),

  getRestaurantOrders: (propertyId: string, params?: { status?: FoodOrderStatus }) =>
    apiClient.get<{ data: FoodOrder[] }>(`/food-orders/restaurant/${propertyId}`, { params }),

  updateStatus: (orderId: string, status: FoodOrderStatus, estimatedMinutes?: number) =>
    apiClient.patch<{ data: FoodOrder }>(`/food-orders/${orderId}/status`, { status, estimatedMinutes }),
};
