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
  recordEvents,
  getEventsSummary,
} from './analytics.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { z } from 'zod';

const PurchaseReportDto = z.object({
  reportType: z.enum(['price_trends', 'occupancy_rates', 'client_profiles', 'competitive_analysis']),
});

// Lot d'événements anonymisés (max 20) — aucun champ d'identité accepté
const RecordEventsDto = z.object({
  events: z.array(z.object({
    name: z.string().min(1).max(40),
    platform: z.enum(['mobile', 'web']).optional(),
    role: z.string().max(40).optional(),
    sessionId: z.string().max(64).optional(),
    metadata: z.record(z.unknown()).optional(),
  })).min(1).max(20),
});

export const analyticsRouter = Router();

// ── Ingestion d'événements (PUBLIC) ──────────────────────────────────────────
// Déclarée AVANT authenticate : la vitrine et l'app avant connexion doivent
// pouvoir émettre. Soumise au consentement côté client et au rate limit global.
analyticsRouter.post('/events', validate(RecordEventsDto), recordEvents);

analyticsRouter.use(authenticate);

// ── Professional analytics ──────────────────────────────────────────────────
analyticsRouter.get('/properties', getPropertyStats);
analyticsRouter.get('/bookings', getBookingStats);
analyticsRouter.get('/occupancy', getOccupancyRate);

// Detailed stats — plans Business/Entreprise uniquement (contrôlé dans le service)
analyticsRouter.get('/detailed', getDetailedStats);

// Market reports
analyticsRouter.get('/market-reports/types', getMarketReportTypes);
analyticsRouter.get('/market-reports', listMarketReports);
analyticsRouter.post('/market-reports', validate(PurchaseReportDto), purchaseMarketReport);

// ── Admin analytics ─────────────────────────────────────────────────────────
analyticsRouter.get('/revenue', authorize('admin'), getRevenue);
analyticsRouter.get('/events/summary', authorize('admin'), getEventsSummary);
