// Admin routes — platform management (admin role only)
import { Router } from 'express';
import {
  // Dashboard
  getDashboardStats,
  getAdvancedStats,
  // User management
  listUsers,
  getUser,
  suspendUser,
  reactivateUser,
  banUser,
  updateUserNotes,
  updateUserRole,
  getKycDocuments,
  forcePasswordReset,
  approveKyc,
  rejectKyc,
  revoke2fa,
  // Property — liste complète + détail
  listAllProperties,
  getPropertyDetail,
  reactivateProperty,
  // Property moderation
  listPendingProperties,
  approveProperty,
  rejectProperty,
  listPendingMenuItems,
  approveMenuItem,
  rejectMenuItem,
  requestPropertyModifications,
  suspendProperty,
  deleteProperty,
  // Bookings
  listBookings,
  getBooking,
  // Disputes
  listDisputes,
  getDispute,
  resolveDispute,
  refundDispute,
  // Platform config
  getAllConfig,
  upsertConfig,
  // Audit logs
  listAuditLogs,
  // Maintenance
  getMaintenance,
  setMaintenance,
  // Promo codes
  listPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  // Client ratings moderation
  listReportedClientRatings,
  hideClientRating,
  restoreClientRating,
  // Email templates
  listEmailTemplates,
  upsertEmailTemplate,
  sendTestEmailTemplate,
  // Review moderation
  hideReview,
  unhideReview,
  deleteReview,
} from './admin.controller';
import { getAllFlags, upsertFlag, deleteFlag } from '../feature-flags/feature-flags.controller';
import { listAdminAccounts, createAdminAccount, updateAdminAccount } from './admin-accounts.controller';
import { getMonitoringDashboard } from './monitoring.controller';
import { changeUserPlan, getSubscriptionHistory, forceRecalculateBenefits, getPaymentFailures } from './admin.controller';
import { ChangeUserPlanDto } from './dto/admin.dto';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import {
  RejectKycDto,
  ResolveDisputeDto,
  RefundDisputeDto,
  UserNotesDto,
  SuspendUserDto,
  ChangeUserRoleDto,
  RejectPropertyDto,
  RequestModificationsDto,
  SuspendPropertyDto,
  UpsertConfigDto,
  SetMaintenanceDto,
  CreatePromoCodeDto,
  UpdatePromoCodeDto,
} from './dto/admin.dto';

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(authorize('admin'));

// ── Dashboard ──────────────────────────────────────────────────────────────────
adminRouter.get('/dashboard', getDashboardStats);
adminRouter.get('/dashboard/advanced', getAdvancedStats);

// ── User management ────────────────────────────────────────────────────────────
adminRouter.get('/users', listUsers);
adminRouter.get('/users/:id', parseId, getUser);
adminRouter.post('/users/:id/suspend', parseId, validate(SuspendUserDto), suspendUser);
adminRouter.post('/users/:id/reactivate', parseId, reactivateUser);
adminRouter.post('/users/:id/ban', parseId, banUser);
adminRouter.patch('/users/:id/notes', parseId, validate(UserNotesDto), updateUserNotes);
adminRouter.patch('/users/:id/role', parseId, validate(ChangeUserRoleDto), updateUserRole);
adminRouter.get('/users/:id/kyc-documents', parseId, getKycDocuments);
adminRouter.post('/users/:id/force-password-reset', parseId, forcePasswordReset);
adminRouter.post('/users/:id/kyc/approve', parseId, approveKyc);
adminRouter.post('/users/:id/kyc/reject', parseId, validate(RejectKycDto), rejectKyc);
adminRouter.post('/users/:id/revoke-2fa', parseId, revoke2fa);
adminRouter.patch('/users/:id/plan', parseId, validate(ChangeUserPlanDto), changeUserPlan);
adminRouter.get('/users/:id/subscription-history', parseId, getSubscriptionHistory);
adminRouter.post('/users/:id/subscription/recalculate', parseId, forceRecalculateBenefits);

// ── Abonnements — vue globale ──────────────────────────────────────────────────
adminRouter.get('/subscriptions/payment-failures', getPaymentFailures);

// ── Propriétés — liste complète + détail ──────────────────────────────────────
// Important : les routes littérales (/pending) doivent être avant /:id
adminRouter.get('/properties', listAllProperties);
adminRouter.get('/properties/pending', listPendingProperties);
adminRouter.get('/properties/:id', parseId, getPropertyDetail);

// ── Modération des propriétés ─────────────────────────────────────────────────
adminRouter.post('/properties/:id/approve', parseId, approveProperty);
adminRouter.post('/properties/:id/reject', parseId, validate(RejectPropertyDto), rejectProperty);
adminRouter.post('/properties/:id/request-modifications', parseId, validate(RequestModificationsDto), requestPropertyModifications);
adminRouter.post('/properties/:id/suspend', parseId, validate(SuspendPropertyDto), suspendProperty);
adminRouter.post('/properties/:id/reactivate', parseId, reactivateProperty);
adminRouter.delete('/properties/:id', parseId, deleteProperty);

// ── Modération des plats (menus restaurant) ───────────────────────────────────
adminRouter.get('/menu-items/pending', listPendingMenuItems);
adminRouter.post('/menu-items/:id/approve', parseId, approveMenuItem);
adminRouter.post('/menu-items/:id/reject', parseId, rejectMenuItem);

// ── Bookings ───────────────────────────────────────────────────────────────────
adminRouter.get('/bookings', listBookings);
adminRouter.get('/bookings/:id', parseId, getBooking);

// ── Disputes ───────────────────────────────────────────────────────────────────
adminRouter.get('/disputes', listDisputes);
adminRouter.get('/disputes/:id', parseId, getDispute);
adminRouter.post('/disputes/:id/resolve', parseId, validate(ResolveDisputeDto), resolveDispute);
adminRouter.post('/disputes/:id/refund', parseId, validate(RefundDisputeDto), refundDispute);

// ── Platform config ────────────────────────────────────────────────────────────
adminRouter.get('/config', getAllConfig);
adminRouter.patch('/config', validate(UpsertConfigDto), upsertConfig);

// ── Audit logs ─────────────────────────────────────────────────────────────────
adminRouter.get('/audit-logs', listAuditLogs);

// ── Mode maintenance ───────────────────────────────────────────────────────────
adminRouter.get('/maintenance', getMaintenance);
adminRouter.put('/maintenance', validate(SetMaintenanceDto), setMaintenance);

// ── Promo codes ────────────────────────────────────────────────────────────────
adminRouter.get('/promo-codes', listPromoCodes);
adminRouter.post('/promo-codes', validate(CreatePromoCodeDto), createPromoCode);
adminRouter.patch('/promo-codes/:id', parseId, validate(UpdatePromoCodeDto), updatePromoCode);
adminRouter.delete('/promo-codes/:id', parseId, deletePromoCode);

// ── Email templates ────────────────────────────────────────────────────────────
adminRouter.get('/email-templates', listEmailTemplates);
adminRouter.post('/email-templates/test', sendTestEmailTemplate);
adminRouter.put('/email-templates/:name', upsertEmailTemplate);

// ── Client ratings moderation ──────────────────────────────────────────────────
adminRouter.get('/client-ratings/reported', listReportedClientRatings);
adminRouter.patch('/client-ratings/:id/hide', parseId, hideClientRating);
adminRouter.patch('/client-ratings/:id/restore', parseId, restoreClientRating);

// ── Review moderation ──────────────────────────────────────────────────────────
adminRouter.patch('/reviews/:id/hide', parseId, hideReview);
adminRouter.patch('/reviews/:id/unhide', parseId, unhideReview);
adminRouter.delete('/reviews/:id', parseId, deleteReview);

// ── Comptes administrateurs (super_admin uniquement — vérifié dans le contrôleur) ──
adminRouter.get('/accounts', listAdminAccounts);
adminRouter.post('/accounts', createAdminAccount);
adminRouter.patch('/accounts/:id', parseId, updateAdminAccount);

// ── Feature flags ──────────────────────────────────────────────────────────────
adminRouter.get('/feature-flags', getAllFlags);
adminRouter.put('/feature-flags/:key', upsertFlag);
adminRouter.delete('/feature-flags/:key', deleteFlag);

// ── Monitoring dashboard ───────────────────────────────────────────────────────
adminRouter.get('/monitoring', getMonitoringDashboard);
