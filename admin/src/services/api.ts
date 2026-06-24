// Shared Axios API client re-export — alias of src/lib/api.ts for compatibility
export { api, apiClient } from '../lib/api';

import { api, API_BASE } from '../lib/api';
import type { PlatformUser, UserDetail } from '../types/user';
import type { AdminProperty } from '../types/property';
import type { AdminBooking } from '../types/booking';
import type { AdminDispute } from '../types/dispute';

export const usersService = {
  list: (params?: object) => api.get<any>('/admin/users', params),
  getUsers: (params?: object) => api.get<any>('/admin/users', params),
  getById: (id: string) => api.get<UserDetail>(`/admin/users/${id}`),
  getUserById: (id: string) => api.get<UserDetail>(`/admin/users/${id}`),
  suspend: (id: string, reason: string) => api.post(`/admin/users/${id}/suspend`, { reason }),
  reactivate: (id: string) => api.post(`/admin/users/${id}/reactivate`),
  ban: (id: string, reason: string) => api.post(`/admin/users/${id}/ban`, { reason }),
  banUser: (id: string, reason: string) => api.post(`/admin/users/${id}/ban`, { reason }),
  forcePasswordReset: (id: string) => api.post(`/admin/users/${id}/force-password-reset`),
  addNote: (id: string, note: string) => api.patch(`/admin/users/${id}/notes`, { notes: note }),
  approveKyc: (id: string) => api.post(`/admin/users/${id}/kyc/approve`),
  verifyKyc: (id: string) => api.post(`/admin/users/${id}/kyc/approve`),
  getPendingKyc: (params?: object) => api.get('/admin/users', { ...params, kycPending: true }),
  rejectKyc: (id: string, reason: string) => api.post(`/admin/users/${id}/kyc/reject`, { reason }),
  revoke2fa: (id: string) => api.post(`/admin/users/${id}/revoke-2fa`),
  getTransactions: (id: string, params?: object) => api.get<any>(`/admin/users/${id}/transactions`, params),
  changeUserPlan: (id: string, plan: string) => api.patch(`/admin/users/${id}/plan`, { plan }),
  getSubscriptionHistory: (id: string) => api.get<any>(`/admin/users/${id}/subscription-history`),
  forceRecalculateBenefits: (id: string) => api.post<any>(`/admin/users/${id}/subscription/recalculate`),
  getPaymentFailures: (params?: object) => api.get<any>('/admin/subscriptions/payment-failures', params),
};

export const propertiesService = {
  list: (params?: object) => api.get<any>('/admin/properties', params),
  getProperties: (params?: object) => api.get<any>('/admin/properties', params),
  getPending: () => api.get<any>('/admin/properties/pending'),
  getById: (id: string) => api.get<AdminProperty>(`/admin/properties/${id}`),
  getPropertyById: (id: string) => api.get<AdminProperty>(`/admin/properties/${id}`),
  approve: (id: string) => api.post(`/admin/properties/${id}/approve`),
  approveProperty: (id: string) => api.post(`/admin/properties/${id}/approve`),
  reject: (id: string, reason: string) => api.post(`/admin/properties/${id}/reject`, { reason }),
  rejectProperty: (id: string, reason: string) => api.post(`/admin/properties/${id}/reject`, { reason }),
  suspend: (id: string) => api.post(`/admin/properties/${id}/suspend`, { reason: 'Suspension administrative' }),
  suspendWithReason: (id: string, reason: string) => api.post(`/admin/properties/${id}/suspend`, { reason }),
  reactivateProperty: (id: string) => api.post(`/admin/properties/${id}/reactivate`),
  requestModifications: (id: string, feedback: string) => api.post(`/admin/properties/${id}/request-modifications`, { feedback }),
  deleteProperty: (id: string) => api.delete(`/admin/properties/${id}`),
};

export const bookingsService = {
  list: (params?: object) => api.get<any>('/admin/bookings', params),
  getBookings: (params?: object) => api.get<any>('/admin/bookings', params),
  getById: (id: string) => api.get<AdminBooking>(`/admin/bookings/${id}`),
  getBookingById: (id: string) => api.get<AdminBooking>(`/admin/bookings/${id}`),
  cancelBooking: (id: string) => api.post(`/admin/bookings/${id}/cancel`),
  refundBooking: (id: string, body: { amount: number; reason: string }) => api.post(`/admin/bookings/${id}/refund`, body),
};

export const disputesService = {
  list: (params?: object) => api.get<any>('/admin/disputes', params),
  getDisputes: (params?: object) => api.get<any>('/admin/disputes', params),
  getById: (id: string) => api.get<AdminDispute>(`/admin/disputes/${id}`),
  getDisputeById: (id: string) => api.get<AdminDispute>(`/admin/disputes/${id}`),
  resolve: (id: string, resolution: string, notes?: string) =>
    api.post(`/admin/disputes/${id}/resolve`, { resolution, notes }),
  resolveDispute: (id: string, resolution: string, notes?: string) =>
    api.post(`/admin/disputes/${id}/resolve`, { resolution, notes }),
  refund: (id: string, amount: number, notes: string) =>
    api.post(`/admin/disputes/${id}/refund`, { amount, notes }),
  reject: (id: string, reason?: string) => api.post(`/admin/disputes/${id}/resolve`, {
    resolution: 'resolved_no_refund',
    notes: reason ?? 'Litige rejeté par l\'administrateur',
  }),
  sendMessage: (id: string, message: string) =>
    api.post(`/admin/disputes/${id}/messages`, { message }),
};

export const analyticsService = {
  getDashboardStats: () => api.get<any>('/admin/dashboard'),
  getAdvancedStats: () => api.get<any>('/admin/dashboard/advanced'),
  getRevenueChart: (period: string) => api.get<any>('/analytics/revenue', { period }),
  exportCsv: (type: string, params?: object) => api.get<any>(`/admin/audit-logs`, { ...params, format: 'csv' }),
  downloadReport: (type: string, period: string) => api.get<any>(`/admin/audit-logs`, { period, format: 'csv' }),
};

export const configService = {
  getConfig: () => api.get<any>('/admin/config'),
  // Backend expects { key: string, value: unknown }
  updateConfigKey: (key: string, value: unknown) => api.patch('/admin/config', { key, value }),
  // Convenience: update a nested config section
  updateConfig: (patch: Record<string, unknown>) =>
    Promise.all(Object.entries(patch).map(([key, value]) => api.patch('/admin/config', { key, value }))),

  getPromoCodes: (params?: object) => api.get<any>('/admin/promo-codes', params),
  createPromoCode: (promo: object) => api.post('/admin/promo-codes', promo),
  updatePromoCode: (id: string, data: object) => api.patch(`/admin/promo-codes/${id}`, data),
  togglePromoCode: (id: string, isActive: boolean) => api.patch(`/admin/promo-codes/${id}`, { isActive }),
  deletePromoCode: (id: string) => api.delete(`/admin/promo-codes/${id}`),

  getEmailTemplates: () => api.get<any>('/admin/email-templates'),
  updateEmailTemplate: (name: string, data: { subject: string; bodyHtml: string; variables?: string[] }) =>
    api.put(`/admin/email-templates/${name}`, data),
};

export const adminAccountsService = {
  list: (params?: object) => api.get<any>('/admin/accounts', params),
  create: (data: { email: string; firstName: string; lastName: string; role: string; password: string }) =>
    api.post('/admin/accounts', data),
  update: (id: string, data: { role?: string; isActive?: boolean }) =>
    api.patch(`/admin/accounts/${id}`, data),
  deactivate: (id: string) => api.patch(`/admin/accounts/${id}`, { isActive: false }),
  reactivate: (id: string) => api.patch(`/admin/accounts/${id}`, { isActive: true }),
};

export const logsService = {
  // Correct endpoint: /admin/audit-logs
  list: (params?: object) => api.get<any>('/admin/audit-logs', params),
  getAuditLogs: (params?: object) => api.get<any>('/admin/audit-logs', params),
  getById: (id: string) => api.get<any>(`/admin/audit-logs/${id}`),
  getLogById: (id: string) => api.get<any>(`/admin/audit-logs/${id}`),
  exportCsv: (params?: object) => api.get<string>('/admin/audit-logs', { ...params, format: 'csv' }),
};

export const supportService = {
  // Ticket routes — mounted at /api/support, admin sub-routes at /support/admin/tickets
  getStats: () => api.get<any>('/support/admin/stats'),
  listTickets: (params?: object) => api.get<any>('/support/admin/tickets', params),
  getTicket: (id: string) => api.get<any>(`/support/admin/tickets/${id}`),
  assignTicket: (id: string, assigneeId: string) =>
    api.patch(`/support/admin/tickets/${id}/assign`, { assigneeId }),
  changeStatus: (id: string, status: string) =>
    api.patch(`/support/admin/tickets/${id}/status`, { status }),
  addComment: (id: string, content: string, isInternal: boolean) =>
    api.post(`/support/admin/tickets/${id}/comments`, { content, isInternal }),

  // Chatbot admin routes
  getChatbotStats: () => api.get<any>('/support/admin/chatbot/stats'),
  getChatbotConversations: (limit?: number) =>
    api.get<any>('/support/admin/chatbot/conversations', limit ? { limit } : undefined),
  getUnansweredQuestions: (limit?: number) =>
    api.get<any>('/support/admin/chatbot/unanswered', limit ? { limit } : undefined),
  getChatbotFaq: () => api.get<any>('/support/admin/chatbot/faq'),
  updateChatbotFaq: (faq: unknown[]) => api.put('/support/admin/chatbot/faq', { faq }),
};

// ── Site vitrine — administration de la page d'accueil ───────────────────────
export const websiteService = {
  // Hero
  getHero: () => api.get<any>('/website/home/hero'),
  updateHero: (data: { title: string; subtitle: string; buttonText: string; buttonUrl: string }) =>
    api.put('/website/admin/hero', data),
  uploadHeroImage: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile('/website/admin/hero/image', fd);
  },

  // Mission
  getMission: () => api.get<any>('/website/home/mission'),
  updateMission: (text: string) => api.put('/website/admin/mission', { text }),

  // Solutions preview
  listSolutions: () => api.get<any[]>('/website/admin/solutions'),
  createSolution: (d: { title: string; summary: string; icon: string; link: string }) =>
    api.post('/website/admin/solutions', d),
  updateSolution: (id: string, d: object) => api.put(`/website/admin/solutions/${id}`, d),
  deleteSolution: (id: string) => api.delete(`/website/admin/solutions/${id}`),
  reorderSolutions: (ids: string[]) => api.put('/website/admin/solutions/reorder', { ids }),

  // Products preview
  listProducts: () => api.get<any[]>('/website/admin/products'),
  createProduct: (d: { title: string; description: string; badge?: string; link: string }) =>
    api.post('/website/admin/products', d),
  updateProduct: (id: string, d: object) => api.put(`/website/admin/products/${id}`, d),
  uploadProductImage: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile(`/website/admin/products/${id}/image`, fd);
  },
  deleteProduct: (id: string) => api.delete(`/website/admin/products/${id}`),
  reorderProducts: (ids: string[]) => api.put('/website/admin/products/reorder', { ids }),

  // Why cards
  listWhy: () => api.get<any[]>('/website/admin/why'),
  createWhy: (d: { title: string; description: string; icon: string }) =>
    api.post('/website/admin/why', d),
  updateWhy: (id: string, d: object) => api.put(`/website/admin/why/${id}`, d),
  deleteWhy: (id: string) => api.delete(`/website/admin/why/${id}`),
  reorderWhy: (ids: string[]) => api.put('/website/admin/why/reorder', { ids }),

  // Products page
  getProductsPageIntro: () => api.get<any>('/website/products/intro'),
  updateProductsPageIntro: (d: { title: string; paragraph: string }) =>
    api.put('/website/admin/products-page/intro', d),
  listSubPlans: () => api.get<any[]>('/website/admin/products-plans'),
  updateSubPlan: (id: string, d: object) => api.put(`/website/admin/products-plans/${id}`, d),
  listSubRows: () => api.get<any[]>('/website/admin/products-rows'),
  createSubRow: (d: object) => api.post('/website/admin/products-rows', d),
  updateSubRow: (id: string, d: object) => api.put(`/website/admin/products-rows/${id}`, d),
  deleteSubRow: (id: string) => api.delete(`/website/admin/products-rows/${id}`),
  reorderSubRows: (ids: string[]) => api.put('/website/admin/products-rows/reorder', { ids }),
  getProductsBoostSection: () => api.get<any>('/website/products/boost'),
  updateProductsBoostSection: (d: object) => api.put('/website/admin/products-page/boost', d),
  getProductsAdsSection: () => api.get<any>('/website/products/ads'),
  updateProductsAdsSection: (d: object) => api.put('/website/admin/products-page/ads', d),
  listDataPacks: () => api.get<any[]>('/website/admin/products-data'),
  createDataPack: (d: object) => api.post('/website/admin/products-data', d),
  updateDataPack: (id: string, d: object) => api.put(`/website/admin/products-data/${id}`, d),
  deleteDataPack: (id: string) => api.delete(`/website/admin/products-data/${id}`),
  reorderDataPacks: (ids: string[]) => api.put('/website/admin/products-data/reorder', { ids }),
  listUpcoming: () => api.get<any[]>('/website/admin/products-upcoming'),
  createUpcoming: (d: object) => api.post('/website/admin/products-upcoming', d),
  updateUpcoming: (id: string, d: object) => api.put(`/website/admin/products-upcoming/${id}`, d),
  deleteUpcoming: (id: string) => api.delete(`/website/admin/products-upcoming/${id}`),
  reorderUpcoming: (ids: string[]) => api.put('/website/admin/products-upcoming/reorder', { ids }),

  // Solutions page blocs
  getSolutionsPageIntro: () => api.get<any>('/website/solutions/intro'),
  updateSolutionsPageIntro: (d: { headline: string; subtext: string }) =>
    api.put('/website/admin/solutions-page/intro', d),
  listSolutionsBlocs: () => api.get<any[]>('/website/admin/solutions-blocs'),
  createSolutionsBloc: (d: object) => api.post('/website/admin/solutions-blocs', d),
  updateSolutionsBloc: (id: string, d: object) => api.put(`/website/admin/solutions-blocs/${id}`, d),
  deleteSolutionsBloc: (id: string) => api.delete(`/website/admin/solutions-blocs/${id}`),
  reorderSolutionsBlocs: (ids: string[]) => api.put('/website/admin/solutions-blocs/reorder', { ids }),

  // Testimonials
  listTestimonials: () => api.get<any[]>('/website/admin/testimonials'),
  createTestimonial: (d: { name: string; rating: number; text: string; role?: string }) =>
    api.post('/website/admin/testimonials', d),
  updateTestimonial: (id: string, d: object) => api.put(`/website/admin/testimonials/${id}`, d),
  uploadTestimonialPhoto: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile(`/website/admin/testimonials/${id}/photo`, fd);
  },
  deleteTestimonial: (id: string) => api.delete(`/website/admin/testimonials/${id}`),
  reorderTestimonials: (ids: string[]) => api.put('/website/admin/testimonials/reorder', { ids }),

  // Careers
  getCareersPresentation: () => api.get<any>('/website/admin/careers/presentation'),
  upsertCareersPresentation: (d: object) => api.put('/website/admin/careers/presentation', d),
  getCareersTeam: () => api.get<any>('/website/admin/careers/team'),
  upsertCareersTeam: (text: string, photo?: File) => {
    const fd = new FormData(); fd.append('text', text);
    if (photo) fd.append('photo', photo);
    return api.uploadFile('/website/admin/careers/team', fd);
  },
  listCareersValues: () => api.get<any[]>('/website/admin/careers/values'),
  createCareersValue: (d: object) => api.post('/website/admin/careers/values', d),
  updateCareersValue: (id: string, d: object) => api.put(`/website/admin/careers/values/${id}`, d),
  deleteCareersValue: (id: string) => api.delete(`/website/admin/careers/values/${id}`),
  reorderCareersValues: (ids: string[]) => api.put('/website/admin/careers/values/reorder', { ids }),
  listCareersBenefits: () => api.get<any[]>('/website/admin/careers/benefits'),
  createCareersBenefit: (d: object) => api.post('/website/admin/careers/benefits', d),
  updateCareersBenefit: (id: string, d: object) => api.put(`/website/admin/careers/benefits/${id}`, d),
  deleteCareersBenefit: (id: string) => api.delete(`/website/admin/careers/benefits/${id}`),
  reorderCareersBenefits: (ids: string[]) => api.put('/website/admin/careers/benefits/reorder', { ids }),
  listCareersFaq: () => api.get<any[]>('/website/admin/careers/faq'),
  createCareersFaq: (d: object) => api.post('/website/admin/careers/faq', d),
  updateCareersFaq: (id: string, d: object) => api.put(`/website/admin/careers/faq/${id}`, d),
  deleteCareersFaq: (id: string) => api.delete(`/website/admin/careers/faq/${id}`),
  reorderCareersFaq: (ids: string[]) => api.put('/website/admin/careers/faq/reorder', { ids }),
  listCareersJobs: () => api.get<any[]>('/website/admin/careers/jobs'),
  createCareersJob: (d: object) => api.post('/website/admin/careers/jobs', d),
  updateCareersJob: (id: string, d: object) => api.put(`/website/admin/careers/jobs/${id}`, d),
  deleteCareersJob: (id: string) => api.delete(`/website/admin/careers/jobs/${id}`),
  listApplications: (status?: string) => api.get<any[]>(`/website/admin/careers/applications${status ? `?status=${status}` : ''}`),
  updateApplicationStatus: (id: string, status: string, notes?: string) =>
    api.put(`/website/admin/careers/applications/${id}`, { status, notes }),
  deleteApplication: (id: string) => api.delete(`/website/admin/careers/applications/${id}`),

  // About
  getAboutHistory: () => api.get<any>('/website/admin/about/history'),
  upsertAboutHistory: (d: { title: string; content: string }) => api.put('/website/admin/about/history', d),
  getAboutMission: () => api.get<any>('/website/admin/about/mission'),
  upsertAboutMission: (d: { title: string; content: string }) => api.put('/website/admin/about/mission', d),
  listAboutValues: () => api.get<any[]>('/website/admin/about/values'),
  createAboutValue: (d: object) => api.post('/website/admin/about/values', d),
  updateAboutValue: (id: string, d: object) => api.put(`/website/admin/about/values/${id}`, d),
  deleteAboutValue: (id: string) => api.delete(`/website/admin/about/values/${id}`),
  reorderAboutValues: (ids: string[]) => api.put('/website/admin/about/values/reorder', { ids }),
  listAboutTeam: () => api.get<any[]>('/website/admin/about/team'),
  createAboutTeam: (d: object) => api.post('/website/admin/about/team', d),
  updateAboutTeam: (id: string, d: object) => api.put(`/website/admin/about/team/${id}`, d),
  uploadAboutTeamPhoto: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile(`/website/admin/about/team/${id}/photo`, fd);
  },
  deleteAboutTeam: (id: string) => api.delete(`/website/admin/about/team/${id}`),
  reorderAboutTeam: (ids: string[]) => api.put('/website/admin/about/team/reorder', { ids }),
  listAboutPartners: () => api.get<any[]>('/website/admin/about/partners'),
  createAboutPartner: (d: object) => api.post('/website/admin/about/partners', d),
  updateAboutPartner: (id: string, d: object) => api.put(`/website/admin/about/partners/${id}`, d),
  uploadAboutPartnerLogo: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile(`/website/admin/about/partners/${id}/logo`, fd);
  },
  deleteAboutPartner: (id: string) => api.delete(`/website/admin/about/partners/${id}`),
  reorderAboutPartners: (ids: string[]) => api.put('/website/admin/about/partners/reorder', { ids }),

  // Contact messages
  listContactMessages: (page: number, limit: number, status: 'all' | 'read' | 'unread') =>
    api.get<any>('/website/admin/messages', { page, limit, status }),
  markMessageRead: (id: string, isRead: boolean) =>
    api.put(`/website/admin/messages/${id}/read`, { isRead }),
  replyMessage: (id: string, replyText: string) =>
    api.post(`/website/admin/messages/${id}/reply`, { replyText }),
  exportMessagesUrl: () => `${API_BASE}/website/admin/messages/export`,

  // Blog — Posts
  listBlogPosts: (page = 1, limit = 20, search = '') =>
    api.get<any>('/website/admin/blog/posts', { page, limit, search }),
  getBlogPost: (id: string) => api.get<any>(`/website/admin/blog/posts/${id}`),
  createBlogPost: (d: object) => api.post('/website/admin/blog/posts', d),
  updateBlogPost: (id: string, d: object) => api.put(`/website/admin/blog/posts/${id}`, d),
  deleteBlogPost: (id: string) => api.delete(`/website/admin/blog/posts/${id}`),
  uploadBlogCover: (id: string, file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.uploadFile(`/website/admin/blog/posts/${id}/cover`, fd);
  },

  // Blog — Categories
  listBlogCategories: () => api.get<any[]>('/website/admin/blog/categories'),
  createBlogCategory: (d: { name: string; slug: string }) =>
    api.post('/website/admin/blog/categories', d),
  updateBlogCategory: (id: string, d: { name: string; slug: string }) =>
    api.put(`/website/admin/blog/categories/${id}`, d),
  deleteBlogCategory: (id: string) => api.delete(`/website/admin/blog/categories/${id}`),

  // Blog — Newsletter
  listNewsletterSubscribers: (page = 1, limit = 50) =>
    api.get<any>('/website/admin/blog/newsletter', { page, limit }),
  updateNewsletterSubscriberStatus: (id: string, status: string) =>
    api.put(`/website/admin/blog/newsletter/${id}/status`, { status }),
  deleteNewsletterSubscriber: (id: string) =>
    api.delete(`/website/admin/blog/newsletter/${id}`),
  exportNewsletterUrl: () => `${API_BASE}/website/admin/blog/newsletter/export`,

  // Blog — Comments
  listBlogComments: (status?: string) =>
    api.get<any[]>('/website/admin/blog/comments', status ? { status } : {}),
  approveComment: (id: string) => api.put(`/website/admin/blog/comments/${id}/approve`, {}),
  deleteComment: (id: string) => api.delete(`/website/admin/blog/comments/${id}`),

  // FAQ
  listFaq: () => api.get<any[]>('/website/admin/faq'),
  createFaq: (d: { category: string; question: string; answer: string; order: number }) =>
    api.post('/website/admin/faq', d),
  updateFaq: (id: number, d: { category?: string; question?: string; answer?: string; order?: number }) =>
    api.put(`/website/admin/faq/${id}`, d),
  deleteFaq: (id: number) => api.delete(`/website/admin/faq/${id}`),

  // Partnership requests
  listPartnerships: (page = 1, limit = 20, status?: string) =>
    api.get<any>('/website/admin/partnerships', { page, limit, ...(status ? { status } : {}) }),
  updatePartnershipStatus: (id: string, status: string) =>
    api.put(`/website/admin/partnerships/${id}`, { status }),
  deletePartnership: (id: string) => api.delete(`/website/admin/partnerships/${id}`),

  // Community — Posts
  listCommunityPosts: (page = 1, limit = 20, status?: string) =>
    api.get<any>('/website/admin/community/posts', { page, limit, ...(status ? { status } : {}) }),
  hideCommunityPost: (id: string) => api.put(`/website/admin/community/posts/${id}/hide`, {}),
  showCommunityPost: (id: string) => api.put(`/website/admin/community/posts/${id}/show`, {}),
  deleteCommunityPost: (id: string) => api.delete(`/website/admin/community/posts/${id}`),

  // Community — Comments
  listCommunityComments: (page = 1, limit = 20, status?: string) =>
    api.get<any>('/website/admin/community/comments', { page, limit, ...(status ? { status } : {}) }),
  hideCommunityComment: (id: string) => api.put(`/website/admin/community/comments/${id}/hide`, {}),
  deleteCommunityComment: (id: string) => api.delete(`/website/admin/community/comments/${id}`),

  // Community — Reports
  listCommunityReports: (page = 1, limit = 20, resolved?: boolean) =>
    api.get<any>('/website/admin/community/reports', { page, limit, ...(resolved !== undefined ? { resolved } : {}) }),
  resolveCommunityReport: (id: string) => api.put(`/website/admin/community/reports/${id}/resolve`, {}),

  // Community — Challenges
  listAdminChallenges: () => api.get<any[]>('/website/admin/community/challenges'),
  createChallenge: (data: { title: string; description: string; startDate: Date; endDate: Date; isActive: boolean }) =>
    api.post('/website/admin/community/challenges', data),
  updateChallenge: (id: string, data: Partial<{ title: string; description: string; startDate: Date; endDate: Date; isActive: boolean }>) =>
    api.put(`/website/admin/community/challenges/${id}`, data),
  deleteChallenge: (id: string) => api.delete(`/website/admin/community/challenges/${id}`),
};

// ── Feature flags ─────────────────────────────────────────────────────────────
export const featureFlagsService = {
  // Tous les flags (admin)
  getAll: () => api.get<any[]>('/admin/feature-flags'),
  // Créer ou mettre à jour un flag
  upsert: (key: string, enabled: boolean, description?: string) =>
    api.put(`/admin/feature-flags/${key}`, { enabled, description }),
  // Supprimer un flag
  delete: (key: string) => api.delete(`/admin/feature-flags/${key}`),
};
