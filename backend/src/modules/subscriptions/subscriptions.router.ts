// Subscriptions routes — plan management for professional accounts
import { Router } from 'express';
import { getMySubscription, upgradePlan, cancelSubscription, listPlans, listInvoices } from './subscriptions.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { UpgradePlanDto } from './dto/subscription.dto';

export const subscriptionsRouter = Router();

// Public: list available plans
subscriptionsRouter.get('/plans', listPlans);

subscriptionsRouter.use(authenticate);
subscriptionsRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin'));

subscriptionsRouter.get('/me', getMySubscription);
subscriptionsRouter.get('/invoices', listInvoices);
subscriptionsRouter.post('/upgrade', validate(UpgradePlanDto), upgradePlan);
subscriptionsRouter.post('/cancel', cancelSubscription);
