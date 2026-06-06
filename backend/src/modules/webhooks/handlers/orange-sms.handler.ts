// Handler webhook Orange SMS — traite les delivery reports (DeliveredToTerminal, DeliveryImpossible…)
import { prisma } from '../../../database/prisma.service';
import { logger } from '../../../common/utils/logger';
import { env } from '../../../config/env.config';

// Statuts Orange SMS API (OMA SMSMessaging v1)
const ORANGE_SUCCESS = new Set(['DeliveredToTerminal', 'DeliveredToNetwork']);
const ORANGE_FAILED  = new Set(['DeliveryImpossible', 'DeliveryNotificationNotSupported']);
const ORANGE_EXPIRED = new Set(['MessageExpired']);

export interface OrangeSmsDeliveryReport {
  deliveryInfoNotification?: {
    callbackData?: string;
    deliveryInfo?: {
      address?: string;     // "tel:+225XXXXXXXXXX"
      deliveryStatus?: string; // "DeliveredToTerminal" | "DeliveryImpossible" | ...
    };
  };
}

/**
 * Vérifie le secret du webhook Orange.
 * Orange ne signe pas les callbacks — on compare le callbackData avec un préfixe secret optionnel.
 * En production : filtrer par IP Orange (si connu) ou utiliser un token dans l'URL.
 */
export function verifyOrangeSmsWebhook(token: string | undefined): boolean {
  const secret = env.ORANGE_WEBHOOK_SECRET;
  if (!secret) return true;
  return token === secret;
}

export async function handleOrangeSmsDelivery(payload: OrangeSmsDeliveryReport): Promise<void> {
  const notification = payload.deliveryInfoNotification;
  if (!notification) {
    logger.warn('Orange SMS webhook : payload invalide (pas de deliveryInfoNotification)');
    return;
  }

  const callbackData    = notification.callbackData ?? null;   // = smsLog.id envoyé à l'envoi
  const deliveryInfo    = notification.deliveryInfo;
  const rawStatus       = deliveryInfo?.deliveryStatus ?? null;
  const address         = deliveryInfo?.address ?? null;        // "tel:+225XXXXXXXXXX"
  const recipient       = address ? address.replace(/^tel:/, '') : null;

  logger.debug(
    `Orange SMS delivery : status=${rawStatus ?? '?'} recipient=${recipient ?? '?'} ` +
    `callbackData=${callbackData ?? '?'}`,
  );

  if (!rawStatus) {
    logger.warn('Orange SMS webhook : deliveryStatus absent');
    return;
  }

  let newStatus: 'delivered' | 'failed' | 'expired' | null = null;
  if (ORANGE_SUCCESS.has(rawStatus))  newStatus = 'delivered';
  else if (ORANGE_FAILED.has(rawStatus)) newStatus = 'failed';
  else if (ORANGE_EXPIRED.has(rawStatus)) newStatus = 'expired';

  if (!newStatus) {
    logger.debug(`Orange SMS webhook : statut non définitif (${rawStatus}), ignoré`);
    return;
  }

  // Cas 1 : on a le callbackData = smsLog.id → mise à jour directe
  if (callbackData) {
    const updated = await prisma.smsLog.updateMany({
      where: { id: callbackData, status: { notIn: ['delivered', 'failed', 'expired'] } },
      data: {
        status: newStatus,
        ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
        ...(newStatus !== 'delivered' ? { errorCode: rawStatus } : {}),
      },
    });

    if (updated.count > 0) {
      logger.info(`Orange SMS : smsLog=${callbackData} → ${newStatus}`);
    }
  }

  // Cas 2 : fallback par numéro de téléphone si callbackData absent
  if (!callbackData && recipient) {
    await prisma.smsLog.updateMany({
      where: {
        recipient,
        status: { notIn: ['delivered', 'failed', 'expired'] },
      },
      data: {
        status: newStatus,
        ...(newStatus === 'delivered' ? { deliveredAt: new Date() } : {}),
        ...(newStatus !== 'delivered' ? { errorCode: rawStatus } : {}),
      },
    });
  }

  // Alerte admin pour les échecs + SMS OTP non livrés
  if (newStatus === 'failed' || newStatus === 'expired') {
    logger.warn(`Orange SMS : livraison échouée — recipient=${recipient ?? '?'} status=${rawStatus}`);

    // Vérifie si c'était un OTP pour log supplémentaire
    if (callbackData) {
      const log = await prisma.smsLog.findUnique({
        where: { id: callbackData },
        select: { isOtp: true, recipient: true },
      });
      if (log?.isOtp) {
        logger.error(
          `ALERTE SMS OTP : livraison échouée (${rawStatus}) pour ${log.recipient} — ` +
          'le client n\'a peut-être pas reçu son code. Vérifiez manuellement.',
        );
      }
    }
  }
}
