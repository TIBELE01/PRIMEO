// Subscriptions routes — plan management for professional accounts
import { Router } from 'express';
import { getMySubscription, upgradePlan, cancelSubscription, listPlans, listInvoices, getSlots, purchaseSlots, cancelSlots, getSlotTransactionStatus } from './subscriptions.controller';
import { authenticate } from '../../common/middleware/jwt-auth.middleware';
import { authorize } from '../../common/middleware/roles.middleware';
import { requireKycApproved } from '../professional/middlewares/professional.middleware';
import { validate } from '../../common/validators/validation.middleware';
import { UpgradePlanDto } from './dto/subscription.dto';

export const subscriptionsRouter = Router();

subscriptionsRouter.use(authenticate);
subscriptionsRouter.use(authorize('professional_hebergement', 'professional_hotel', 'professional_immobilier', 'restaurateur', 'admin'));
// Liste des formules : réservée aux professionnels connectés (modèle économique non public).
subscriptionsRouter.get('/plans', listPlans);

subscriptionsRouter.use(requireKycApproved); // les admins passent, les pros doivent avoir un KYC approuvé

subscriptionsRouter.get('/me', getMySubscription);
subscriptionsRouter.get('/invoices', listInvoices);
subscriptionsRouter.post('/upgrade', validate(UpgradePlanDto), upgradePlan);
subscriptionsRouter.post('/cancel', cancelSubscription);

// Publications supplémentaires (500 FCFA/slot/mois)
subscriptionsRouter.get('/slots', getSlots);
subscriptionsRouter.post('/slots/purchase', purchaseSlots);
subscriptionsRouter.post('/slots/cancel', cancelSlots);
subscriptionsRouter.get('/slots/transaction/:txId', getSlotTransactionStatus);
