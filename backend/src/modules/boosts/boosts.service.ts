// Boosts service — paid (2000 FCFA/72h) and free (Prestige/Premium quota) property promotions
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { PAID_BOOST_COST_FCFA, PAID_BOOST_DURATION_DAYS, PLAN_DETAILS } from '../../common/constants/subscription-plans';
import { env } from '../../config/env.config';
import { CreateBoostInput } from './dto/boost.dto';
import { notificationsService } from '../notifications/notifications.service';

export const boostsService = {
  async create(ownerId: string, input: CreateBoostInput) {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, ownerId: true, status: true, isBoosted: true, title: true },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== ownerId) throw new HttpError(403, 'Vous n\'êtes pas propriétaire de cette annonce');
    if (property.status !== 'active') throw new HttpError(400, 'Seules les annonces actives peuvent être boostées');
    if (property.isBoosted) throw new HttpError(409, 'Cette annonce est déjà boostée');

    if (input.type === 'free') {
      return boostsService._activateFreeBoost(ownerId, input.propertyId);
    }

    return boostsService._initiatePaidBoost(ownerId, input.propertyId, property.title);
  },

  async _activateFreeBoost(ownerId: string, propertyId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId: ownerId } });
    if (!sub) throw new HttpError(400, 'Aucun abonnement actif');

    const plan = PLAN_DETAILS[sub.planType];
    if (!plan || plan.freeBoostsPerMonth === 0) {
      throw new HttpError(400, 'Votre plan ne comprend pas de boosts gratuits');
    }

    const remaining = sub.boostsFreeMonthly - sub.boostsFreeUsedThisMonth;
    if (remaining <= 0) {
      throw new HttpError(400, 'Quota de boosts gratuits mensuel épuisé');
    }

    const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { title: true } });

    const durationDays = plan.boostDurationDays;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const [boost] = await prisma.$transaction([
      prisma.boost.create({
        data: {
          userId: ownerId,
          propertyId,
          type: 'free',
          amount: 0,
          startDate,
          endDate,
        },
      }),
      prisma.property.update({
        where: { id: propertyId },
        data: { isBoosted: true, boostExpiresAt: endDate },
      }),
      prisma.subscription.update({
        where: { userId: ownerId },
        data: { boostsFreeUsedThisMonth: { increment: 1 } },
      }),
    ]);

    void notificationsService.notify({
      type: 'boost_activated',
      recipientId: ownerId,
      data: { propertyTitle: property?.title ?? '', durationDays },
    }).catch(() => {});

    return { boost, type: 'free', durationDays };
  },

  async _initiatePaidBoost(ownerId: string, propertyId: string, propertyTitle: string) {
    const user = await prisma.user.findUnique({
      where: { id: ownerId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');

    const tx = await prisma.transaction.create({
      data: {
        userId: ownerId,
        type: 'boost_purchase',
        amount: PAID_BOOST_COST_FCFA,
        netAmount: PAID_BOOST_COST_FCFA,
        status: 'initiated',
        notes: propertyId,
        webhookPayload: { propertyId, propertyTitle } as never,
      },
    });

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount: PAID_BOOST_COST_FCFA,
      bookingId: tx.id,
      customerEmail: user.email,
      customerPhone: user.phone ?? undefined,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      returnUrl: `${env.FRONTEND_URL ?? env.BACKEND_URL}/boosts?txId=${tx.id}`,
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { geniusPayTransactionId: reference, checkoutUrl },
    });

    return { transactionId: tx.id, checkoutUrl, type: 'paid', amount: PAID_BOOST_COST_FCFA };
  },

  // Called by the webhook handler after boost_purchase payment.success
  async activatePaidBoost(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'boost_purchase') return;

    const propertyId = tx.notes;
    if (!propertyId) return;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { isBoosted: true },
    });
    if (!property || property.isBoosted) return; // already activated or gone

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + PAID_BOOST_DURATION_DAYS * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.boost.create({
        data: {
          userId: tx.userId,
          propertyId,
          type: 'paid',
          amount: tx.amount,
          startDate,
          endDate,
        },
      }),
      prisma.property.update({
        where: { id: propertyId },
        data: { isBoosted: true, boostExpiresAt: endDate },
      }),
    ]);

    // Notify the property owner
    const owner = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { title: true, ownerId: true },
    });
    if (owner) {
      void notificationsService.notify({
        type: 'boost_activated',
        recipientId: owner.ownerId,
        data: { propertyTitle: owner.title, durationDays: PAID_BOOST_DURATION_DAYS },
      }).catch(() => {});
    }
  },

  async listForOwner(ownerId: string) {
    const boosts = await prisma.boost.findMany({
      where: { property: { ownerId } },
      include: { property: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    });
    // Normalisation pour le mobile : expose `expiresAt`, `isActive` et `property.name`
    const now = Date.now();
    return boosts.map((b) => ({
      ...b,
      expiresAt: b.endDate,
      isActive: b.endDate.getTime() > now,
      property: { name: b.property?.title ?? 'Annonce' },
    }));
  },

  async getBalance(userId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) return { freeBoostsRemaining: 0, freeBoostsTotal: 0, freeBoostDuration: 0, plan: null, planType: null };
    const plan = PLAN_DETAILS[sub.planType];
    const freeBoostsRemaining = Math.max(0, sub.boostsFreeMonthly - sub.boostsFreeUsedThisMonth);
    return {
      freeBoostsRemaining,
      freeBoostsTotal: sub.boostsFreeMonthly,
      freeBoostDuration: plan?.boostDurationDays ?? 0,
      plan: sub.planType,
      planType: sub.planType,
    };
  },

  async expireBoosts() {
    const now = new Date();
    const expired = await prisma.boost.findMany({
      where: { endDate: { lte: now }, property: { isBoosted: true } },
      select: { propertyId: true },
    });

    if (expired.length === 0) return 0;

    const propertyIds = [...new Set(expired.map((b) => b.propertyId))];
    await prisma.property.updateMany({
      where: { id: { in: propertyIds } },
      data: { isBoosted: false, boostExpiresAt: null },
    });

    return propertyIds.length;
  },
};
