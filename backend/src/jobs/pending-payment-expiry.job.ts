// Job d'expiration des réservations impayées — vérifie Genius Pay puis annule après la période de grâce
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import {
  processSuccessfulPayment,
  processFailedPayment,
} from '../modules/webhooks/handlers/genius-pay.handler';
import { notificationsService } from '../modules/notifications/notifications.service';

// Délai de grâce : 2 heures après la création de la réservation
const GRACE_PERIOD_MS = 2 * 60 * 60 * 1000;

// Statuts Genius Pay indiquant un paiement confirmé
const GP_SUCCESS = new Set(['success', 'successful', 'completed', 'paid', 'accepted', 'approved']);
// Statuts Genius Pay indiquant un paiement définitivement échoué
const GP_FAILED  = new Set(['failed', 'failure', 'cancelled', 'canceled', 'rejected', 'declined', 'expired']);

async function expireUnpaidBookings(): Promise<void> {
  const graceCutoff = new Date(Date.now() - GRACE_PERIOD_MS);

  // Réservations en attente de paiement créées avant la fin de la période de grâce
  const expiredBookings = await prisma.booking.findMany({
    where: {
      status: 'pending_payment',
      createdAt: { lt: graceCutoff },
    },
    include: {
      transactions: {
        where: {
          type: 'client_payment',
          geniusPayTransactionId: { not: null },
        },
        orderBy: { initiatedAt: 'desc' },
        take: 1,
      },
      client: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { title: true } },
    },
  });

  if (expiredBookings.length === 0) {
    logger.debug('Expiration paiements : aucune réservation expirée');
    return;
  }

  logger.info(`Expiration paiements : ${expiredBookings.length} réservation(s) à traiter`);

  for (const booking of expiredBookings) {
    try {
      await processExpiredBooking(booking);
    } catch (err) {
      logger.error(`Expiration paiements : erreur pour booking=${booking.id}`, err);
    }
  }
}

async function processExpiredBooking(booking: {
  id: string;
  status: string;
  clientId: string;
  createdAt: Date;
  client: { id: string; firstName: string; lastName: string };
  property: { title: string };
  transactions: Array<{
    id: string;
    status: string;
    geniusPayTransactionId: string | null;
    amount: number;
  }>;
}): Promise<void> {
  // Sécurité : ne pas annuler une réservation déjà traitée (race condition possible)
  const current = await prisma.booking.findUnique({
    where: { id: booking.id },
    select: { status: true },
  });
  if (!current || current.status !== 'pending_payment') {
    logger.debug(`Expiration paiements : booking=${booking.id} déjà traité (status=${current?.status}), ignoré`);
    return;
  }

  const tx = booking.transactions[0] ?? null;

  // Cas 1 : transaction avec référence Genius Pay → on vérifie le statut réel
  if (tx?.geniusPayTransactionId) {
    const reference = tx.geniusPayTransactionId;
    try {
      const gpStatus = await geniusPayService.getPaymentStatus(reference);
      logger.info(`Expiration paiements : booking=${booking.id} reference=${reference} GP status=${gpStatus.status}`);

      if (GP_SUCCESS.has(gpStatus.status)) {
        // Paiement finalement reçu — on confirme la réservation
        const fullTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
        if (fullTx) {
          await processSuccessfulPayment(fullTx, gpStatus.amount ?? fullTx.amount);
          logger.info(`Expiration paiements : booking=${booking.id} CONFIRMÉ (paiement retrouvé)`);
        }
        return;
      }

      if (GP_FAILED.has(gpStatus.status)) {
        // Paiement définitivement échoué — processFailedPayment gère l'annulation + notifs
        const fullTx = await prisma.transaction.findUnique({ where: { id: tx.id } });
        if (fullTx) {
          await processFailedPayment(fullTx);
          logger.info(`Expiration paiements : booking=${booking.id} ANNULÉ (paiement échoué GP)`);
          await logCancellation(booking.id, booking.clientId, 'Paiement refusé par Genius Pay (expiration)');
        }
        return;
      }

      // GP renvoie encore "pending" mais la grâce est dépassée → annulation forcée
      logger.info(`Expiration paiements : booking=${booking.id} GP encore pending — annulation forcée`);
    } catch (err) {
      // Genius Pay inaccessible — on annule quand même pour libérer les dates
      logger.warn(`Expiration paiements : impossible de vérifier GP pour booking=${booking.id}, annulation forcée`, err);
    }
  }

  // Cas 2 : pas de transaction GP (ou GP encore pending) → annulation forcée après délai de grâce
  await forceCancelBooking(booking, tx?.id ?? null);
}

async function forceCancelBooking(
  booking: {
    id: string;
    clientId: string;
    client: { id: string; firstName: string; lastName: string };
    property: { title: string };
  },
  transactionId: string | null,
): Promise<void> {
  const cancellationReason = 'Paiement non reçu dans le délai imparti (2 heures)';

  await prisma.$transaction(async (p) => {
    // Annulation de la réservation
    await p.booking.update({
      where: { id: booking.id },
      data: {
        status: 'cancelled_by_client',
        cancelledAt: new Date(),
        cancellationReason,
        cancelledBy: 'system',
      },
    });

    // Marquer la transaction comme échouée si elle existait
    if (transactionId) {
      await p.transaction.updateMany({
        where: { id: transactionId, status: 'initiated' },
        data: { status: 'failed' },
      });
    }
  });

  // Notification au client (email + push + in-app) — fire-and-forget
  notificationsService.notify({
    type: 'booking_cancelled',
    recipientId: booking.clientId,
    data: {
      bookingId:     booking.id,
      propertyTitle: booking.property.title,
      reason:        cancellationReason,
    },
  }).catch((err) => logger.warn(`Expiration paiements : notification échec booking=${booking.id}`, err));

  await logCancellation(booking.id, booking.clientId, cancellationReason);

  logger.info(
    `Expiration paiements : booking=${booking.id} ANNULÉ — client=${booking.clientId} ` +
    `propriété="${booking.property.title}" motif="${cancellationReason}"`,
  );
}

async function logCancellation(bookingId: string, clientId: string, reason: string): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: clientId,
      action: 'booking.auto_cancelled',
      targetType: 'booking',
      targetId: bookingId,
      description: reason,
    },
  }).catch((err) => logger.warn('Expiration paiements : échec création AuditLog', err));
}

export function startPendingPaymentExpiryJob(): void {
  // Toutes les heures à :30 (décalé du webhook-recovery qui tourne à :00)
  cron.schedule('30 * * * *', async () => {
    logger.info('Expiration paiements : démarrage');
    try {
      await expireUnpaidBookings();
    } catch (err) {
      logger.error('Expiration paiements : job échoué', err);
    }
  });

  logger.info('Expiration paiements : job planifié (toutes les heures à :30)');
}
