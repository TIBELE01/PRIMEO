// Boosts service — paid (2000 FCFA/72h) and free (Prestige/Premium quota) property promotions
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { getPaidBoostCost, getPaidBoostDuration, getPlanDetails } from '../../common/constants/subscription-plans';
import { env } from '../../config/env.config';
import { CreateBoostInput } from './dto/boost.dto';
import { notificationsService } from '../notifications/notifications.service';
import { isBoostActive } from '../properties/services/search.service';

export const boostsService = {
  async create(ownerId: string, input: CreateBoostInput) {
    const property = await prisma.property.findUnique({
      where: { id: input.propertyId },
      select: { id: true, ownerId: true, status: true, isBoosted: true, boostExpiresAt: true, title: true },
    });
    if (!property) throw new HttpError(404, 'Propriété introuvable');
    if (property.ownerId !== ownerId) throw new HttpError(403, 'Vous n\'êtes pas propriétaire de cette annonce');
    if (property.status !== 'active') throw new HttpError(400, 'Seules les annonces actives peuvent être boostées');
    // Boost en cours = drapeau actif ET expiration future (le cron peut ne pas être encore passé)
    if (isBoostActive(property)) throw new HttpError(409, 'Cette annonce est déjà boostée');

    if (input.type === 'free') {
      return boostsService._activateFreeBoost(ownerId, input.propertyId);
    }

    return boostsService._initiatePaidBoost(ownerId, input.propertyId, property.title);
  },

  async _activateFreeBoost(ownerId: string, propertyId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId: ownerId } });
    if (!sub) throw new HttpError(400, 'Aucun abonnement actif');

    const plan = getPlanDetails(sub.planType);
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

    // Décompte atomique du quota : deux demandes simultanées ne peuvent pas dépasser
    // le nombre de boosts gratuits de la formule.
    const boost = await prisma.$transaction(async (tx) => {
      const consumed = await tx.subscription.updateMany({
        where: { userId: ownerId, boostsFreeUsedThisMonth: { lt: sub.boostsFreeMonthly } },
        data: { boostsFreeUsedThisMonth: { increment: 1 } },
      });
      if (consumed.count === 0) throw new HttpError(400, 'Quota de boosts gratuits mensuel épuisé');
      const created = await tx.boost.create({
        data: { userId: ownerId, propertyId, type: 'free', amount: 0, startDate, endDate },
      });
      await tx.property.update({
        where: { id: propertyId },
        data: { isBoosted: true, boostExpiresAt: endDate },
      });
      return created;
    });

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

    const boostCost = getPaidBoostCost();

    const tx = await prisma.transaction.create({
      data: {
        userId: ownerId,
        type: 'boost_purchase',
        amount: boostCost,
        netAmount: boostCost,
        status: 'initiated',
        notes: propertyId,
        webhookPayload: { propertyId, propertyTitle } as never,
      },
    });

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount: boostCost,
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

    return { transactionId: tx.id, checkoutUrl, type: 'paid', amount: boostCost };
  },

  // Called by the webhook handler after boost_purchase payment.success
  async activatePaidBoost(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'boost_purchase') return;

    const propertyId = tx.notes;
    if (!propertyId) return;

    // Idempotence : assurée en amont par le webhook (une transaction déjà « success »
    // n'est jamais rejouée), l'activation n'est donc appelée qu'une fois par paiement.
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { isBoosted: true, boostExpiresAt: true },
    });
    if (!property) return;

    const durationDays = getPaidBoostDuration();
    // Boost déjà en cours (ex. boost gratuit activé pendant le paiement) : le boost payé
    // prolonge le boost existant au lieu d'être perdu.
    const startDate = isBoostActive(property) ? new Date(property.boostExpiresAt!) : new Date();
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

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
        data: { propertyTitle: owner.title, durationDays },
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
    const plan = getPlanDetails(sub.planType);
    const freeBoostsRemaining = Math.max(0, sub.boostsFreeMonthly - sub.boostsFreeUsedThisMonth);
    return {
      freeBoostsRemaining,
      freeBoostsTotal: sub.boostsFreeMonthly,
      freeBoostDuration: plan?.boostDurationDays ?? 0,
      plan: sub.planType,
      planType: sub.planType,
    };
  },

  // Désactive les annonces dont le boost est arrivé à échéance. Se base sur la date
  // d'expiration portée par l'annonce : un ancien boost expiré ne peut plus couper un
  // nouveau boost activé ensuite sur la même annonce.
  async expireBoosts() {
    const now = new Date();
    const result = await prisma.property.updateMany({
      where: {
        isBoosted: true,
        OR: [{ boostExpiresAt: { lte: now } }, { boostExpiresAt: null }],
      },
      data: { isBoosted: false, boostExpiresAt: null },
    });
    return result.count;
  },
};
