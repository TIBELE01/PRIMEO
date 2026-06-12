// Routes des reversements — réservées aux comptes professionnels.
import { Router } from 'express';
import { listMyPayouts, getMyPayoutSummary } from './payouts.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';

export const payoutsRouter = Router();

payoutsRouter.use(authenticate);
payoutsRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur'));

payoutsRouter.get('/me', listMyPayouts);
payoutsRouter.get('/me/summary', getMyPayoutSummary);
