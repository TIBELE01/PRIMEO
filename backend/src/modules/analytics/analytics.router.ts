// Analytics routes — professional stats and market intelligence
import { Router } from 'express';
import {
  getRevenue,
  getBookingStats,
  getPropertyStats,
  getDetailedStats,
  getOccupancyRate,
  getMarketReportTypes,
  listMarketReports,
  purchaseMarketReport,
} from './analytics.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { z } from 'zod';

const PurchaseReportDto = z.object({
  reportType: z.enum(['price_trends', 'occupancy_rates', 'client_profiles', 'competitive_analysis']),
});

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);

// ── Professional analytics ──────────────────────────────────────────────────
analyticsRouter.get('/properties', getPropertyStats);
analyticsRouter.get('/bookings', getBookingStats);
analyticsRouter.get('/occupancy', getOccupancyRate);

// Detailed stats — Prestige/Premium only (enforced in service)
analyticsRouter.get('/detailed', getDetailedStats);

// Market reports
analyticsRouter.get('/market-reports/types', getMarketReportTypes);
analyticsRouter.get('/market-reports', listMarketReports);
analyticsRouter.post('/market-reports', validate(PurchaseReportDto), purchaseMarketReport);

// ── Admin analytics ─────────────────────────────────────────────────────────
analyticsRouter.get('/revenue', authorize('admin'), getRevenue);
