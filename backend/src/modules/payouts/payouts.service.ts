// Service de reversements aux professionnels.
//
// Un reversement crédite le portefeuille du professionnel pour une réservation
// confirmée payée en ligne (full_online ou ten_percent_online), du montant NET
// après déduction des frais Genius Pay. Le taux de frais est configurable via
// platform_config['genius_pay_fee_percent'] (défaut 0 % — le professionnel reçoit
// alors l'intégralité de la part payée en ligne). Chaque opération est tracée
// dans la table `payouts` (une ligne par réservation → idempotence) et reflétée
// par une transaction `payout_to_professional` dans le journal financier.
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma.service';
import { logger } from '../../common/utils/logger';
import { walletService } from '../wallets/wallets.service';

const FEE_CONFIG_KEY = 'genius_pay_fee_percent';
const BATCH_LIMIT = 500;

/** Lit le taux de frais Genius Pay (%) depuis platform_config. Défaut sûr : 0. */
async function getGeniusPayFeePercent(): Promise<number> {
  const row = await prisma.platformConfig.findUnique({ where: { key: FEE_CONFIG_KEY } });
  const raw = row?.value as unknown;
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : 0;
  return Number.isFinite(n) && n >= 0 && n < 100 ? n : 0;
}

function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

export const payoutsService = {
  /**
   * Reverse à chaque professionnel le net des réservations éligibles non encore
   * réglées. Idempotent : la contrainte d'unicité sur payouts.bookingId empêche
   * tout double crédit, même en cas d'exécutions concurrentes.
   */
  async runDailyPayouts(): Promise<{ processed: number; totalNet: number; errors: number }> {
    const feePercent = await getGeniusPayFeePercent();

    const bookings = await prisma.booking.findMany({
      where: {
        status: { in: ['confirmed', 'completed'] },
        paymentOption: { in: ['full_online', 'ten_percent_online'] },
        onlinePaidAmount: { gt: 0 },
        payout: { is: null }, // pas encore reversé
        // le paiement en ligne a réussi et n'a pas été remboursé
        transactions: {
          some: { type: 'client_payment', status: 'success' },
          none: { type: 'refund', status: 'success' },
        },
      },
      select: {
        id: true,
        onlinePaidAmount: true,
        property: { select: { ownerId: true, title: true } },
      },
      take: BATCH_LIMIT,
    });

    let processed = 0;
    let totalNet = 0;
    let errors = 0;

    for (const b of bookings) {
      const ownerId = b.property.ownerId;
      const gross = b.onlinePaidAmount;
      const fee = Math.round((gross * feePercent) / 100);
      const net = gross - fee;
      if (net <= 0) continue;

      try {
        await prisma.$transaction(async (tx) => {
          // 1) Trace du reversement (bookingId unique → garde-fou anti-doublon)
          await tx.payout.create({
            data: {
              bookingId: b.id,
              professionalId: ownerId,
              grossAmount: gross,
              feeAmount: fee,
              netAmount: net,
              feePercent: new Prisma.Decimal(feePercent),
              status: 'completed',
              notes: `Reversement auto — en ligne ${gross} FCFA, frais GP ${fee} FCFA (${feePercent} %), net ${net} FCFA`,
            },
          });

          // 2) Écriture au journal financier (cohérence avec les autres flux)
          await tx.transaction.create({
            data: {
              userId: ownerId,
              type: 'payout_to_professional',
              amount: net,
              fee,
              netAmount: net,
              status: 'success',
              bookingId: b.id,
              completedAt: new Date(),
              notes: `Reversement réservation ${b.id}`,
            },
          });

          // 3) Crédit atomique du portefeuille du professionnel
          await walletService.credit(ownerId, net, tx);
        });

        processed += 1;
        totalNet += net;
      } catch (err) {
        // Doublon (course entre deux exécutions) → déjà reversé, on ignore.
        if (isUniqueViolation(err)) continue;
        errors += 1;
        logger.warn(`Reversement échoué pour la réservation ${b.id}`, err);
      }
    }

    if (processed > 0 || errors > 0) {
      logger.info(`Reversements pros : ${processed} traités (${totalNet} FCFA), ${errors} échec(s), frais ${feePercent} %`);
    }
    return { processed, totalNet, errors };
  },

  /** Historique paginé des reversements d'un professionnel (pour le dashboard). */
  async listForProfessional(professionalId: string, page = 1, limit = 20) {
    const where = { professionalId };
    const [data, total] = await Promise.all([
      prisma.payout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
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
      prisma.payout.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  /** Synthèse : total déjà reversé + montant en attente de reversement. */
  async getSummary(professionalId: string) {
    const agg = await prisma.payout.aggregate({
      where: { professionalId, status: 'completed' },
      _sum: { netAmount: true },
      _count: true,
    });

    // Montant en attente : réservations éligibles pas encore reversées.
    const pending = await prisma.booking.findMany({
      where: {
        status: { in: ['confirmed', 'completed'] },
        paymentOption: { in: ['full_online', 'ten_percent_online'] },
        onlinePaidAmount: { gt: 0 },
        payout: { is: null },
        property: { ownerId: professionalId },
        transactions: {
          some: { type: 'client_payment', status: 'success' },
          none: { type: 'refund', status: 'success' },
        },
      },
      select: { onlinePaidAmount: true },
    });
    const feePercent = await getGeniusPayFeePercent();
    const pendingNet = pending.reduce((s, b) => {
      const fee = Math.round((b.onlinePaidAmount * feePercent) / 100);
      return s + (b.onlinePaidAmount - fee);
    }, 0);

    return {
      totalPaidOut: agg._sum.netAmount ?? 0,
      payoutsCount: agg._count,
      pendingNet,
      pendingCount: pending.length,
      feePercent,
    };
  },
};
