// Genius Pay webhook handler — event-specific processing logic
import type { Transaction } from '@prisma/client';
import { prisma } from '../../../database/prisma.service';
import { logger } from '../../../common/utils/logger';
import { sendBookingConfirmationEmail, sendTemplateEmail } from '../../../common/utils/mailer';
import { sendPushNotification } from '../../../common/utils/push';
import { sendSms } from '../../../common/utils/sms';
import { brevoConfig } from '../../../config/brevo.config';
import { boostsService } from '../../boosts/boosts.service';
import { subscriptionsService } from '../../subscriptions/subscriptions.service';
import { analyticsService } from '../../analytics/analytics.service';
import { generateAndUploadBookingInvoice } from '../../../common/utils/invoice';

// ── Génération de facture ─────────────────────────────────────────────────────

function countNights(start: Date, end: Date): number {
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return diff > 0 ? diff : 1;
}

// Génère (si absente) la facture PDF d'une réservation, la stocke sur Cloudinary et renvoie son URL
export async function ensureBookingInvoice(bookingId: string): Promise<string | null> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { firstName: true, lastName: true, email: true } },
      property: { select: { title: true, propertyType: true } },
    },
  });
  if (!booking) return null;
  if (booking.invoiceUrl) return booking.invoiceUrl;

  const isRestaurant = booking.property.propertyType === 'restaurant';
  const nights = countNights(booking.startDate, booking.endDate);

  // Description de la ligne sur la facture selon le secteur
  const lineDescription = isRestaurant
    ? `${booking.property.title} — Réservation de table · ${booking.guests} couvert${booking.guests > 1 ? 's' : ''}`
    : `${booking.property.title} — ${nights} nuit${nights > 1 ? 's' : ''}`;

  try {
    const url = await generateAndUploadBookingInvoice({
      invoiceNumber: booking.id.slice(0, 8).toUpperCase(),
      invoiceDate: new Date(),
      customerName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
      customerEmail: booking.client.email,
      propertyTitle: booking.property.title,
      startDate: booking.startDate,
      endDate: booking.endDate,
      nights,
      totalAmount: booking.totalAmount,
      onlinePaidAmount: booking.onlinePaidAmount,
      remainingCashAmount: booking.remainingCashAmount,
      lineDescription,
      sectionLabel: isRestaurant ? 'Réservation' : 'Séjour',
    });

    await prisma.booking.update({ where: { id: bookingId }, data: { invoiceUrl: url } });
    return url;
  } catch (err) {
    logger.warn(`Échec génération facture réservation ${bookingId}`, err);
    return null;
  }
}

// ── Availability blocking ─────────────────────────────────────────────────────

async function blockAvailability(propertyId: string, startDate: Date, endDate: Date): Promise<void> {
  const dates: Date[] = [];
  const current = new Date(startDate);
  while (current < endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  await Promise.all(
    dates.map((date) =>
      prisma.availability.upsert({
        where: { propertyId_date: { propertyId, date } },
        update: { status: 'booked' },
        create: { propertyId, date, status: 'booked' },
      }),
    ),
  );
}

// ── Notification helpers ──────────────────────────────────────────────────────

async function notifyBookingConfirmed(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      property: {
        select: {
          title: true,
          ownerId: true,
          owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      },
    },
  });
  if (!booking) return;

  const startStr = booking.startDate.toLocaleDateString('fr-CI');
  const endStr = booking.endDate.toLocaleDateString('fr-CI');
  const clientName = `${booking.client.firstName} ${booking.client.lastName}`;
  const ownerName = `${booking.property.owner.firstName} ${booking.property.owner.lastName}`;

  // Générer la facture PDF (stockée sur la réservation) avant d'envoyer les emails
  const invoiceUrl = (await ensureBookingInvoice(bookingId)) ?? undefined;

  // Notifications in-app persistées (visibles dans l'application)
  await prisma.notification
    .create({
      data: {
        userId: booking.clientId,
        type: 'booking_confirmed',
        title: 'Réservation confirmée',
        body: `Votre réservation à ${booking.property.title} (${startStr} → ${endStr}) est confirmée.`,
        data: { bookingId, type: 'booking_confirmed' } as never,
      },
    })
    .catch((err) => logger.warn('In-app notification (client) failed', err));

  await prisma.notification
    .create({
      data: {
        userId: booking.property.ownerId,
        type: 'new_booking',
        title: 'Nouvelle réservation',
        body: `Nouvelle réservation pour ${booking.property.title} par ${clientName} (${startStr}).`,
        data: { bookingId, type: 'new_booking' } as never,
      },
    })
    .catch((err) => logger.warn('In-app notification (owner) failed', err));

  // Email to client
  await sendBookingConfirmationEmail({
    to: [{ email: booking.client.email, name: clientName }],
    firstName: booking.client.firstName,
    bookingId,
    propertyTitle: booking.property.title,
    startDate: startStr,
    endDate: endStr,
    totalAmount: booking.totalAmount,
    invoiceUrl,
  }).catch((err) => logger.warn('Booking confirmation email to client failed', err));

  // Email to professional (new booking alert)
  await sendTemplateEmail(
    [{ email: booking.property.owner.email, name: ownerName }],
    brevoConfig.templates.bookingConfirmation,
    {
      firstName: ownerName,
      bookingId,
      propertyTitle: booking.property.title,
      clientName,
      startDate: startStr,
      endDate: endStr,
      totalAmount: booking.totalAmount.toLocaleString('fr-CI') + ' FCFA',
      bookingUrl: `https://primeo.ci/professional/bookings/${bookingId}`,
    },
  ).catch((err) => logger.warn('Booking notification email to professional failed', err));

  // Push to client
  await sendPushNotification({
    externalUserIds: [booking.clientId],
    headings: { en: 'Booking Confirmed', fr: 'Réservation confirmée' },
    contents: {
      en: `Your booking at ${booking.property.title} (${startStr} → ${endStr}) is confirmed.`,
      fr: `Votre réservation à ${booking.property.title} (${startStr} → ${endStr}) est confirmée.`,
    },
    data: { type: 'booking_confirmed', bookingId },
  }).catch((err) => logger.warn('Push to client failed', err));

  // Push to professional
  await sendPushNotification({
    externalUserIds: [booking.property.ownerId],
    headings: { en: 'New Booking', fr: 'Nouvelle réservation' },
    contents: {
      en: `New booking for ${booking.property.title} from ${clientName} (${startStr}).`,
      fr: `Nouvelle réservation pour ${booking.property.title} par ${clientName} (${startStr}).`,
    },
    data: { type: 'new_booking', bookingId },
  }).catch((err) => logger.warn('Push to professional failed', err));

  // SMS to professional if phone available
  if (booking.property.owner.phone) {
    await sendSms(
      booking.property.owner.phone,
      `PRIMEO: Nouvelle réservation confirmée pour ${booking.property.title} du ${startStr} au ${endStr} par ${clientName}. Montant: ${booking.totalAmount.toLocaleString('fr-CI')} FCFA.`,
    ).catch((err) => logger.warn('SMS to professional failed', err));
  }

  // SMS au client si téléphone disponible
  if (booking.client.phone) {
    await sendSms(
      booking.client.phone,
      `PRIMEO: Votre réservation à ${booking.property.title} du ${startStr} au ${endStr} est confirmée. Réf: ${bookingId.slice(0, 8).toUpperCase()}.`,
    ).catch((err) => logger.warn('SMS to client failed', err));
  }
}

async function notifyBookingCancelled(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      client: { select: { id: true, firstName: true, email: true } },
      property: {
        select: {
          title: true,
          ownerId: true,
          owner: { select: { id: true, firstName: true, email: true } },
        },
      },
    },
  });
  if (!booking) return;

  const startStr = booking.startDate.toLocaleDateString('fr-CI');

  // Email to client
  await sendTemplateEmail(
    [{ email: booking.client.email, name: booking.client.firstName }],
    brevoConfig.templates.bookingCancellation,
    {
      firstName: booking.client.firstName,
      propertyTitle: booking.property.title,
      startDate: startStr,
      reason: 'Échec du paiement',
    },
  ).catch((err) => logger.warn('Cancellation email failed', err));

  // Push to client
  await sendPushNotification({
    externalUserIds: [booking.clientId],
    headings: { en: 'Booking Cancelled', fr: 'Réservation annulée' },
    contents: {
      en: `Your booking at ${booking.property.title} was cancelled due to payment failure.`,
      fr: `Votre réservation à ${booking.property.title} a été annulée suite à un échec de paiement.`,
    },
    data: { type: 'booking_cancelled', bookingId },
  }).catch((err) => logger.warn('Push cancellation to client failed', err));
}

// ── Traitement partagé (webhook + réconciliation par sondage) ──────────────────

// Applique un paiement réussi de manière idempotente : transaction, réservation,
// disponibilités, facture et notifications. Réutilisé par le webhook et le polling.
export async function processSuccessfulPayment(
  tx: Transaction,
  paidAmount: number,
  data?: Record<string, unknown>,
): Promise<void> {
  if (tx.status === 'success') {
    logger.info(`Paiement déjà traité : tx=${tx.id}`);
    return;
  }

  await prisma.$transaction(async (p) => {
    await p.transaction.update({
      where: { id: tx.id },
      data: {
        status: 'success',
        completedAt: new Date(),
        webhookReceived: data ? true : tx.webhookReceived,
        ...(data ? { webhookPayload: data as never } : {}),
      },
    });

    if (tx.bookingId) {
      await p.booking.update({
        where: { id: tx.bookingId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
          onlinePaidAmount: paidAmount,
        },
      });

      // Incrémenter bookingsCount sur la propriété
      const booking = await p.booking.findUnique({
        where: { id: tx.bookingId },
        select: { propertyId: true },
      });
      if (booking) {
        await p.property.update({
          where: { id: booking.propertyId },
          data: { bookingsCount: { increment: 1 } },
        });
      }
    }
  });

  // Effets de bord post-succès (best-effort, non critiques)
  if (tx.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: tx.bookingId },
      select: { propertyId: true, startDate: true, endDate: true },
    });
    if (booking) {
      await blockAvailability(booking.propertyId, booking.startDate, booking.endDate).catch((err) =>
        logger.warn('Failed to block availability dates', err),
      );
    }
    await notifyBookingConfirmed(tx.bookingId).catch((err) =>
      logger.warn('Failed to send booking confirmation notifications', err),
    );
  }

  if (tx.type === 'boost_purchase') {
    await boostsService.activatePaidBoost(tx.id).catch((err) =>
      logger.warn('Failed to activate paid boost', err),
    );
    logger.info(`Paid boost activated: txId=${tx.id}`);
  }

  if (tx.type === 'subscription_payment') {
    // Changement de formule payant initié depuis l'espace pro : on applique le plan
    // une fois le paiement validé (les renouvellements automatiques sont gérés par le cron).
    await subscriptionsService.applyPaidPlanChange(tx.id).catch((err) =>
      logger.warn('Failed to apply paid plan change', err),
    );
    logger.info(`Subscription plan change applied: txId=${tx.id}`);
  }

  if (tx.type === 'market_report_purchase') {
    analyticsService.generateMarketReport(tx.id).catch((err) =>
      logger.warn('Failed to generate market report', err),
    );
    logger.info(`Market report generation triggered: txId=${tx.id}`);
  }

  logger.info(`Paiement réussi traité : type=${tx.type}, tx=${tx.id}`);
}

// Applique un paiement échoué/refusé de manière idempotente : transaction,
// annulation de la réservation et notifications.
export async function processFailedPayment(
  tx: Transaction,
  data?: Record<string, unknown>,
): Promise<void> {
  if (tx.status === 'failed') {
    logger.info(`Échec de paiement déjà traité : tx=${tx.id}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: 'failed',
      webhookReceived: data ? true : tx.webhookReceived,
      ...(data ? { webhookPayload: data as never } : {}),
    },
  });

  if (tx.bookingId) {
    // Ne pas écraser une réservation déjà confirmée/annulée
    const booking = await prisma.booking.findUnique({
      where: { id: tx.bookingId },
      select: { status: true },
    });
    if (booking && booking.status === 'pending_payment') {
      await prisma.booking.update({
        where: { id: tx.bookingId },
        data: {
          status: 'cancelled_by_client',
          cancelledAt: new Date(),
          cancellationReason: 'Paiement refusé par Genius Pay',
          cancelledBy: 'system',
        },
      });

      await notifyBookingCancelled(tx.bookingId).catch((err) =>
        logger.warn('Failed to send cancellation notifications', err),
      );
    }
  }

  logger.warn(`Échec de paiement traité : tx=${tx.id}`);
}

// ── Event handlers (webhook) ───────────────────────────────────────────────────

export async function handlePaymentSuccess(data: Record<string, unknown>): Promise<void> {
  const reference = data['reference'] as string | undefined;
  if (!reference) {
    logger.warn('Genius Pay payment.success: missing reference');
    return;
  }

  const tx = await prisma.transaction.findFirst({
    where: { geniusPayTransactionId: reference },
  });

  if (!tx) {
    logger.warn(`Genius Pay payment.success: no transaction found for reference ${reference}`);
    return;
  }

  const paidAmount = (data['amount'] as number | undefined) ?? tx.amount;
  await processSuccessfulPayment(tx, paidAmount, data);
}

export async function handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
  const reference = data['reference'] as string | undefined;
  if (!reference) {
    logger.warn('Genius Pay payment.failed: missing reference');
    return;
  }

  const tx = await prisma.transaction.findFirst({
    where: { geniusPayTransactionId: reference },
  });

  if (!tx) {
    logger.warn(`Genius Pay payment.failed: no transaction found for reference ${reference}`);
    return;
  }

  await processFailedPayment(tx, data);
}

export async function handlePaymentRefunded(data: Record<string, unknown>): Promise<void> {
  const reference = data['reference'] as string | undefined;
  if (!reference) {
    logger.warn('Genius Pay payment.refunded: missing reference');
    return;
  }

  const tx = await prisma.transaction.findFirst({
    where: { geniusPayTransactionId: reference },
  });

  if (!tx) {
    logger.warn(`Genius Pay payment.refunded: no transaction found for reference ${reference}`);
    return;
  }

  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: 'refunded', webhookReceived: true, webhookPayload: data as never },
  });

  logger.info(`Payment refunded: reference=${reference}`);
}
