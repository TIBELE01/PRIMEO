// Service paiements — intégration API REST Genius Pay
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { InitiatePaymentInput } from './dto/payment.dto';
import { geniusPayService } from './services/genius-pay.service';
import { env } from '../../config/env.config';

export const paymentsService = {
  async initiate(userId: string, input: InitiatePaymentInput): Promise<{ checkoutUrl: string; transactionId: string }> {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { client: { select: { email: true, phone: true, firstName: true, lastName: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.clientId !== userId) throw new HttpError(403, 'Accès non autorisé');
    if (booking.status !== 'pending_payment') {
      throw new HttpError(400, 'Cette réservation ne nécessite pas de paiement en ligne');
    }
    if (booking.onlinePaidAmount <= 0) {
      throw new HttpError(400, 'Aucun montant en ligne à régler pour cette réservation');
    }

    const returnUrl = `${env.FRONTEND_URL ?? 'https://app.primeo.ci'}/bookings/${booking.id}/payment-status`;

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount: booking.onlinePaidAmount,
      bookingId: booking.id,
      customerEmail: booking.client.email,
      customerPhone: booking.client.phone ?? undefined,
      customerName: `${booking.client.firstName} ${booking.client.lastName}`.trim(),
      returnUrl,
    });

    const tx = await prisma.transaction.create({
      data: {
        userId,
        bookingId: booking.id,
        type: 'client_payment',
        amount: booking.onlinePaidAmount,
        fee: 0,
        netAmount: booking.onlinePaidAmount,
        status: 'initiated',
        geniusPayTransactionId: reference,
        checkoutUrl,
      },
    });

    return { checkoutUrl, transactionId: tx.id };
  },

  async getStatus(transactionId: string) {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx) throw new HttpError(404, 'Transaction introuvable');
    return tx;
  },

  async listForUser(userId: string, query: { page?: string; limit?: string }) {
    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { initiatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          booking: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              property: { select: { title: true } },
            },
          },
        },
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);

    return { transactions, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  // Les webhooks Genius Pay sont traités par /api/webhooks/genius-pay (webhooks.service.ts)
  async processWebhook(_payload: unknown, _signature: string, _rawBody: Buffer): Promise<void> {
    throw new HttpError(501, 'Utilisez le endpoint /api/webhooks/genius-pay pour les événements Genius Pay');
  },
};
