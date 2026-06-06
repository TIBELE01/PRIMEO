// Webhooks routes — receives and processes Genius Pay, OneSignal and Brevo events
// Raw body is preserved for HMAC verification (see raw-body.middleware.ts).
// No JWT auth — each handler authenticates via its own mechanism.
import { Router } from 'express';
import { handleGeniusPayWebhook, handleOneSignalWebhook, handleBrevoWebhook, handleOrangeSmsWebhook } from './webhooks.controller';

export const webhooksRouter = Router();

webhooksRouter.post('/genius-pay', handleGeniusPayWebhook);
webhooksRouter.post('/onesignal', handleOneSignalWebhook);
// Endpoint Brevo pour les événements de livraison email (bounce, complaint, delivered, opened)
// Configurez cette URL dans le dashboard Brevo : Transactional → Settings → Webhooks
webhooksRouter.post('/brevo', handleBrevoWebhook);

// Endpoint Orange SMS pour les delivery reports (DeliveredToTerminal, DeliveryImpossible…)
// Passez cette URL dans le champ notifyURL de chaque requête SMS
webhooksRouter.post('/orange-sms', handleOrangeSmsWebhook);
