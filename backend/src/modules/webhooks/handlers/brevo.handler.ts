// Handler Brevo — traitement des événements de livraison email (bounces, plaintes, ouvertures)
import { prisma } from '../../../database/prisma.service';
import { logger } from '../../../common/utils/logger';
import { env } from '../../../config/env.config';

// Seuil de bounces répétés avant alerte admin
const REPEATED_BOUNCE_THRESHOLD = 3;

// Événements Brevo documentés
export type BrevoEventType =
  | 'delivered'
  | 'hard_bounce'
  | 'soft_bounce'
  | 'complaint'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'invalid_email'
  | 'blocked'
  | string;

export interface BrevoEvent {
  event: BrevoEventType;
  email: string;
  /** ID message Brevo (correspond au messageId retourné lors de l'envoi) */
  'message-id'?: string;
  /** Alias alternatif selon la version de l'API Brevo */
  messageId?: string;
  subject?: string;
  ts?: number;
  ts_event?: number;
  reason?: string;
  description?: string;
}

/**
 * Vérifie la signature du webhook Brevo.
 * Brevo ne signe pas les webhooks par défaut : on utilise un secret dans l'en-tête
 * X-Brevo-Webhook-Token configuré côté dashboard Brevo (Custom Headers).
 */
export function verifyBrevoSignature(token: string | undefined): boolean {
  const secret = env.BREVO_WEBHOOK_SECRET;
  if (!secret) return true; // si aucun secret configuré, on accepte (dev/test)
  return token === secret;
}

export async function handleBrevoEvent(event: BrevoEvent): Promise<void> {
  const messageId = event['message-id'] ?? event.messageId ?? null;
  const email     = event.email;
  const eventType = event.event;

  logger.debug(`Brevo webhook : event=${eventType} email=${email} messageId=${messageId ?? '?'}`);

  switch (eventType) {
    case 'delivered':
      await updateEmailLog(messageId, email, 'delivered');
      break;

    case 'opened':
      await updateEmailLog(messageId, email, 'opened');
      break;

    case 'hard_bounce':
    case 'invalid_email':
    case 'blocked':
      await handleBounce(messageId, email, eventType, event.reason ?? event.description ?? null, true);
      break;

    case 'soft_bounce':
      // Soft bounce = temporaire (boîte pleine, serveur indisponible) — on log mais on ne bloque pas
      await handleBounce(messageId, email, eventType, event.reason ?? event.description ?? null, false);
      break;

    case 'complaint':
      // Plainte SPAM — on bloque l'adresse immédiatement
      await handleBounce(messageId, email, 'complaint', 'Plainte SPAM reçue', true);
      break;

    default:
      logger.debug(`Brevo webhook : événement ignoré — ${eventType}`);
  }
}

async function updateEmailLog(
  messageId: string | null,
  email: string,
  status: 'delivered' | 'opened',
): Promise<void> {
  if (!messageId) return;

  await prisma.emailLog.updateMany({
    where: { messageId },
    data: { status },
  }).catch((err) => logger.warn(`emailLog : échec mise à jour ${status} pour messageId=${messageId}`, err));
}

async function handleBounce(
  messageId: string | null,
  email: string,
  eventType: string,
  reason: string | null,
  isPermanent: boolean,
): Promise<void> {
  // Met à jour tous les logs liés à ce messageId
  if (messageId) {
    const statusLabel = eventType === 'complaint' ? 'complained' : 'bounced';
    await prisma.emailLog.updateMany({
      where: { messageId },
      data: {
        status: statusLabel as 'complained' | 'bounced',
        errorMessage: reason ?? eventType,
      },
    }).catch((err) => logger.warn(`emailLog : échec mise à jour bounce pour messageId=${messageId}`, err));
  }

  // Incrément du compteur de bounces sur tous les logs de cet email
  await prisma.emailLog.updateMany({
    where: { recipient: email, status: { in: ['bounced', 'complained'] } },
    data: { bounceCount: { increment: 1 } },
  }).catch(() => null);

  const bounceCount = await prisma.emailLog.count({
    where: { recipient: email, status: { in: ['bounced', 'complained'] } },
  });

  logger.warn(
    `Email bounce : type=${eventType} email=${email} permanent=${isPermanent} ` +
    `raison="${reason ?? '?'}" totalBounces=${bounceCount}`,
  );

  // Bloque l'adresse si bounce permanent ou plainte SPAM
  if (isPermanent) {
    const updated = await prisma.user.updateMany({
      where: { email, emailBounced: false },
      data: { emailBounced: true },
    });
    if (updated.count > 0) {
      logger.warn(`Email blocklist : adresse ${email} marquée comme invalide (bounce permanent)`);
      // Trace dans l'audit log
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (user) {
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'email.bounce_permanent',
            targetType: 'user',
            targetId: user.id,
            description: `Adresse email bloquée suite à un bounce permanent (${eventType}) — ${reason ?? 'sans raison'}`,
          },
        }).catch(() => null);
      }
    }
  }

  // Alerte admin si l'adresse a atteint le seuil de bounces répétés
  if (bounceCount >= REPEATED_BOUNCE_THRESHOLD) {
    logger.error(
      `ALERTE BOUNCE RÉPÉTÉ : email=${email} totalBounces=${bounceCount} ` +
      `(seuil=${REPEATED_BOUNCE_THRESHOLD}) — vérification manuelle recommandée`,
    );
  }
}
