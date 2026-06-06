// Webhooks controller — Genius Pay, OneSignal, Brevo and Orange SMS event processing
import { Request, Response, NextFunction } from 'express';
import { webhooksService } from './webhooks.service';
import { handleBrevoEvent, verifyBrevoSignature } from './handlers/brevo.handler';
import { handleOrangeSmsDelivery, verifyOrangeSmsWebhook } from './handlers/orange-sms.handler';
import { logger } from '../../common/utils/logger';

// Extracts the real client IP, preferring X-Forwarded-For (Render / Cloudflare proxies)
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export async function handleGeniusPayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-genius-signature'] as string;
    if (!signature) {
      res.status(400).json({ error: 'Missing X-Genius-Signature header' });
      return;
    }
    await webhooksService.processGeniusPay(req.body, signature, req.rawBody!, clientIp(req));
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function handleOneSignalWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = req.headers['x-onesignal-signature'] as string | undefined;
    await webhooksService.processOneSignal(req.body, signature, req.rawBody!, clientIp(req));
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function handleBrevoWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Vérification du secret configuré via Custom Headers Brevo (X-Brevo-Webhook-Token)
    const token = req.headers['x-brevo-webhook-token'] as string | undefined;
    if (!verifyBrevoSignature(token)) {
      logger.warn(`Brevo webhook : token invalide depuis ${clientIp(req)}`);
      res.status(401).json({ error: 'Invalid webhook token' });
      return;
    }

    // Brevo peut envoyer un tableau d'événements ou un seul objet
    const events = Array.isArray(req.body) ? req.body : [req.body];

    await Promise.allSettled(
      events.map((event) => handleBrevoEvent(event).catch((err) =>
        logger.error('Brevo webhook : erreur traitement événement', err),
      )),
    );

    // Toujours répondre 200 pour éviter les rejeux Brevo
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

export async function handleOrangeSmsWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Orange ne signe pas les callbacks — vérification par token optionnel dans l'en-tête
    const token = req.headers['x-orange-webhook-token'] as string | undefined;
    if (!verifyOrangeSmsWebhook(token)) {
      logger.warn(`Orange SMS webhook : token invalide depuis ${clientIp(req)}`);
      res.status(401).json({ error: 'Invalid webhook token' });
      return;
    }

    await handleOrangeSmsDelivery(req.body);

    // Orange attend un 200 immédiat, sinon il réessaie
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}
