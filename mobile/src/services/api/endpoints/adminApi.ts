import { apiClient } from '../client';

export const adminApi = {
  // Dashboard
  getDashboardStats: () =>
    apiClient.get('/admin/dashboard'),
  getAdvancedStats: () =>
    apiClient.get('/admin/dashboard/advanced'),

  // Property moderation
  listPendingProperties: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/properties/pending', { params }),
  approveProperty: (id: string) =>
    apiClient.post(`/admin/properties/${id}/approve`),
  rejectProperty: (id: string, reason: string) =>
    apiClient.post(`/admin/properties/${id}/reject`, { reason }),
  requestPropertyModifications: (id: string, feedback: string) =>
    apiClient.post(`/admin/properties/${id}/request-modifications`, { feedback }),

  // User / KYC management
  listUsers: (params?: { role?: string; status?: string; search?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/users', { params }),
  getUser: (id: string) =>
    apiClient.get(`/admin/users/${id}`),
  getKycDocuments: (userId: string) =>
    apiClient.get(`/admin/users/${userId}/kyc-documents`),
  approveKyc: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/kyc/approve`),
  rejectKyc: (userId: string, reason: string) =>
    apiClient.post(`/admin/users/${userId}/kyc/reject`, { reason }),
  suspendUser: (userId: string, reason: string) =>
    apiClient.post(`/admin/users/${userId}/suspend`, { reason }),
  reactivateUser: (userId: string) =>
    apiClient.post(`/admin/users/${userId}/reactivate`),

  // Disputes
  listDisputes: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/disputes', { params }),
  getDispute: (id: string) =>
    apiClient.get(`/admin/disputes/${id}`),
  resolveDispute: (
    id: string,
    resolution: 'resolved_no_refund' | 'resolved_refund_partial' | 'resolved_refund_full',
    notes: string,
  ) => apiClient.post(`/admin/disputes/${id}/resolve`, { resolution, notes }),
  refundDispute: (id: string, amount: number, notes: string) =>
    apiClient.post(`/admin/disputes/${id}/refund`, { amount, notes }),

  // Bookings (admin view)
  listBookings: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/bookings', { params }),
  getBooking: (id: string) =>
    apiClient.get(`/admin/bookings/${id}`),
};
