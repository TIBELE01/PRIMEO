// Client ratings routes — reciprocal evaluation system
import { Router } from 'express';
import {
  createClientRating,
  listGivenRatings,
  listReceivedRatings,
  getClientAggregate,
  checkCanRate,
  reportClientRating,
} from './client-ratings.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { parseId } from '../../common/validators/parse-id.middleware';
import { CreateClientRatingDto, ReportClientRatingDto } from './dto/client-rating.dto';

export const clientRatingsRouter = Router();

clientRatingsRouter.use(authenticate);

// ── Professional only ──────────────────────────────────────────────────────────
// Create a rating for a client (requires professional role)
clientRatingsRouter.post(
  '/',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  validate(CreateClientRatingDto),
  createClientRating,
);

// List ratings given by this professional
clientRatingsRouter.get(
  '/given',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  listGivenRatings,
);

// View a client's aggregate rating (professionals only — never exposed to the client themselves)
clientRatingsRouter.get(
  '/client/:clientId',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  getClientAggregate,
);

// Check if this professional can rate the client for a specific booking
clientRatingsRouter.get(
  '/can-rate/:bookingId',
  authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'),
  requireKycApproved,
  checkCanRate,
);

// ── Clients: list received ratings (scores hidden) ────────────────────────────
clientRatingsRouter.get('/received', listReceivedRatings);

// ── Clients: report an unfair rating ──────────────────────────────────────────
clientRatingsRouter.post(
  '/:id/report',
  parseId,
  validate(ReportClientRatingDto),
  reportClientRating,
);
