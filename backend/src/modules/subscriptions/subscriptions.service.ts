// Subscriptions service — activation, montées en gamme, renouvellements, historique factures
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { PLAN_DETAILS, getPublicationLimit } from '../../common/constants/subscription-plans';
import { UpgradePlanInput } from './dto/subscription.dto';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { notificationsService } from '../notifications/notifications.service';
import { env } from '../../config/env.config';
import { logger } from '../../common/utils/logger';
import { Decimal } from '@prisma/client/runtime/library';

// Contexte d'un recalcul d'avantages
export type BenefitUpdateContext =
  | 'upgrade'
  | 'downgrade'
  | 'admin_force'
  | 'payment_failure'
  | 'reactivation';

function planConfig(planType: string) {
  const plan = PLAN_DETAILS[planType];
  if (!plan) throw new Error(`Unknown plan: ${planType}`);
  return plan;
}

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// Calcule la limite de publications pour un utilisateur (tient compte du type de compte)
async function resolvePubLimit(userId: string, planType: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
  return getPublicationLimit(planType, user?.accountType ?? '');
}

// Normalise un abonnement pour le mobile : expose `plan`, `renewalDate`, `monthlyCost`,
// `pendingPlan` et les capacités dérivées du plan actif.
function serializeSubscription<T extends Record<string, unknown>>(sub: T | null): (T & {
  plan: unknown;
  renewalDate: unknown;
  monthlyCost: unknown;
  pendingPlan: string | null;
}) | null {
  if (!sub) return null;
  const features = (sub.features as Record<string, unknown> | null) ?? {};
  const planType = sub.planType as string;
  const planDef  = PLAN_DETAILS[planType] ?? {};
  return {
    ...sub,
    plan:         planType,
    renewalDate:  sub.nextBillingDate,
    monthlyCost:  sub.monthlyPrice,
    pendingPlan:  (features['pendingPlanType'] as string | undefined) ?? null,
    // capacités exposées pour l'app mobile
    videoUpload:  (planDef as any).videoUpload  ?? false,
    virtualTour:  (planDef as any).virtualTour  ?? false,
    verifiedBadge: (planDef as any).verifiedBadge ?? false,
    premiumBadge: (planDef as any).premiumBadge ?? false,
    analytics:    (planDef as any).analytics    ?? false,
    multiUser:    (planDef as any).multiUser    ?? false,
    monthlyReport: (planDef as any).monthlyReport ?? false,
    betaAccess:   (planDef as any).betaAccess   ?? false,
    loyaltyProgram: (planDef as any).loyaltyProgram ?? false,
    freeBoostsRemaining: Math.max(
      0,
      ((sub.boostsFreeMonthly as number) ?? 0) - ((sub.boostsFreeUsedThisMonth as number) ?? 0),
    ),
  };
}

/**
 * Recalcule et applique tous les avantages liés à une formule d'abonnement.
 * Centralise la logique d'upgrade, de downgrade, de forçage admin et de réactivation.
 */
export async function updatePlanBenefits(
  userId: string,
  newPlanType: string,
  context: BenefitUpdateContext,
): Promise<{ suspendedProperties: Array<{ id: string; title: string }>; previousPlan: string }> {
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  if (!sub) throw new HttpError(404, 'Aucun abonnement trouvé');

  const previousPlan = sub.planType;
  const newPlan = PLAN_DETAILS[newPlanType];
  if (!newPlan) throw new HttpError(400, `Formule inconnue : ${newPlanType}`);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { accountType: true },
  });
  const pubLimit = getPublicationLimit(newPlanType, user?.accountType ?? '');

  // Calcul des boosts :
  // - Upgrade : créditer le nombre mensuel complet, conserver les utilisations en cours
  // - Downgrade : le nouveau plafond mensuel s'applique, on conserve les utilisations
  //   (ne pas enlever les boosts déjà consommés, ne plus en accorder de nouveaux au-delà)
  const usedThisMonth = sub.boostsFreeUsedThisMonth ?? 0;
  const newMonthly = newPlan.freeBoostsPerMonth;

  // Suppression du pendingPlanType si présent
  const currentFeatures = (sub.features as Record<string, unknown> | null) ?? {};
  const newFeatures = { ...currentFeatures };
  delete newFeatures['pendingPlanType'];
  if (context === 'payment_failure') {
    newFeatures['suspendedFromPlan'] = previousPlan;
  } else {
    delete newFeatures['suspendedFromPlan'];
  }

  // Mise à jour de l'abonnement en base
  const newStatus = context === 'reactivation' ? 'active' : sub.status === 'suspended' && context !== 'payment_failure' ? 'active' : sub.status;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      planType:                newPlanType as never,
      monthlyPrice:            newPlan.monthlyPrice,
      includedPropertiesLimit: pubLimit,
      commissionRate:          new Decimal(newPlan.commissionRate),
      boostsFreeMonthly:       newMonthly,
      // Pour un upgrade, créditer immédiatement les boosts du mois complet
      ...(context === 'upgrade' ? { boostsFreeUsedThisMonth: 0 } : {}),
      status:                  newStatus as never,
      features:                newFeatures as never,
    },
  });

  // Suspension des annonces excédentaires (downgrade uniquement)
  const suspendedProperties: Array<{ id: string; title: string }> = [];
  if (context !== 'upgrade' && context !== 'reactivation' && pubLimit < 9999) {
    const activeProps = await prisma.property.findMany({
      where: { ownerId: userId, status: 'active' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, title: true },
    });
    if (activeProps.length > pubLimit) {
      const excess = activeProps.slice(pubLimit);
      await prisma.property.updateMany({
        where: { id: { in: excess.map((p) => p.id) } },
        data: { status: 'suspended' as never },
      });
      suspendedProperties.push(...excess);
      logger.warn(
        `updatePlanBenefits [${context}]: ${excess.length} annonce(s) suspendues (userId=${userId}, plan=${newPlanType})`,
      );
    }
  }

  // Réactivation des annonces suspendues si reactivation ou upgrade
  if (context === 'reactivation' || context === 'upgrade') {
    await prisma.property.updateMany({
      where: { ownerId: userId, status: 'suspended' },
      data: { status: 'active' as never },
    });
  }

  // Notification multi-canal
  const prevPlanName = PLAN_DETAILS[previousPlan]?.name ?? previousPlan;
  const newPlanName = newPlan.name;

  const notifType =
    context === 'upgrade'          ? 'subscription_upgraded'    :
    context === 'downgrade'        ? 'subscription_downgraded'  :
    context === 'reactivation'     ? 'subscription_reactivated' :
    context === 'payment_failure'  ? 'subscription_suspended'   :
    'subscription_renewal';

  notificationsService.notify({
    type: notifType,
    recipientId: userId,
    data: {
      previousPlanName: prevPlanName,
      newPlanName,
      planName: newPlanName,
      suspendedCount: suspendedProperties.length > 0 ? suspendedProperties.length : undefined,
      suspendedTitles: suspendedProperties.length > 0
        ? suspendedProperties.map((p) => p.title).join(', ')
        : undefined,
    },
  }).catch((err) => logger.warn(`updatePlanBenefits notify error (userId=${userId})`, err));

  // Journalisation d'audit — non-bloquant (fire-and-forget) pour ne pas perturber le flux principal
  prisma.auditLog.create({
    data: {
      userId,
      action:      `subscription.${context}`,
      targetType:  'subscription',
      targetId:    sub.id,
      description: `Formule ${previousPlan} → ${newPlanType} [${context}]`,
      metadata:    JSON.parse(JSON.stringify({
        old: { plan: previousPlan },
        new: { plan: newPlanType, suspendedCount: suspendedProperties.length },
      })),
    },
  }).catch((err) => logger.warn(`updatePlanBenefits audit error (userId=${userId})`, err));

  logger.info(`updatePlanBenefits [${context}]: ${previousPlan} → ${newPlanType} (userId=${userId})`);
  return { suspendedProperties, previousPlan };
}

export const subscriptionsService = {
  async getForUser(userId: string) {
    let sub = await prisma.subscription.findUnique({
      where: { userId },
      include: {
        transactions: {
          where: { type: 'subscription_payment' },
          orderBy: { initiatedAt: 'desc' },
          take: 1,
        },
      },
    });
    // Auto-réparation : tout professionnel doit avoir la formule Starter au minimum
    if (!sub) {
      await subscriptionsService.createInitial(userId);
      sub = await prisma.subscription.findUnique({
        where: { userId },
        include: {
          transactions: {
            where: { type: 'subscription_payment' },
            orderBy: { initiatedAt: 'desc' },
            take: 1,
          },
        },
      });
    }
    return serializeSubscription(sub as Record<string, unknown> | null);
  },

  // Crée la formule Starter pour un nouveau professionnel (tous types confondus)
  async createInitial(userId: string) {
    const existing = await prisma.subscription.findUnique({ where: { userId } });
    if (existing) return existing;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    const plan = planConfig('starter');
    const pubLimit = getPublicationLimit('starter', user?.accountType ?? '');

    return prisma.subscription.create({
      data: {
        userId,
        planType:               'starter',
        status:                 'active',
        nextBillingDate:        addOneMonth(new Date()),
        monthlyPrice:           plan.monthlyPrice,
        includedPropertiesLimit: pubLimit,
        commissionRate:         new Decimal(plan.commissionRate),
        boostsFreeMonthly:      plan.freeBoostsPerMonth,
        features:               [] as never,
      },
    });
  },

  /**
   * Changement de formule.
   * - Montée en gamme (plan plus cher)  : paiement immédiat via Genius Pay.
   * - Rétrogradation (plan moins cher)  : effective à la prochaine date de facturation.
   * - Passage à Starter (gratuit)       : rétrogradation programmée, aucun remboursement.
   */
  async upgrade(userId: string, input: UpgradePlanInput) {
    let sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) {
      await subscriptionsService.createInitial(userId);
      sub = await prisma.subscription.findUnique({ where: { userId } });
    }
    if (!sub) throw new HttpError(404, 'Aucun abonnement actif');
    // Permettre la réactivation depuis un état suspendu via paiement
    if (sub.status === 'cancelled') throw new HttpError(400, 'Abonnement annulé — contactez le support');
    if (sub.planType === input.plan && sub.status === 'active') throw new HttpError(400, 'Vous êtes déjà sur cette formule');

    const targetPlan = planConfig(input.plan);
    const isUpgrade  = targetPlan.monthlyPrice > sub.monthlyPrice;

    // ── Rétrogradation : programmée à la prochaine facturation ────────────────
    if (!isUpgrade) {
      const currentFeatures = (sub.features as Record<string, unknown> | null) ?? {};
      await prisma.subscription.update({
        where: { userId },
        data: { features: { ...currentFeatures, pendingPlanType: input.plan } as never },
      });
      return {
        requiresPayment: false,
        scheduled:       true,
        message:         `Passage à ${targetPlan.name} programmé pour le ${sub.nextBillingDate.toLocaleDateString('fr-CI')}.`,
        pendingPlan:     input.plan,
        effectiveDate:   sub.nextBillingDate,
      };
    }

    // ── Montée en gamme : paiement immédiat via Genius Pay ────────────────────
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (!user.phone) {
      throw new HttpError(400, 'Ajoutez un numéro de téléphone à votre profil pour régler votre abonnement.');
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        subscriptionId: sub.id,
        type:           'subscription_payment',
        amount:         targetPlan.monthlyPrice,
        fee:            0,
        netAmount:      targetPlan.monthlyPrice,
        status:         'initiated',
        notes:          input.plan,
      },
    });

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount:         targetPlan.monthlyPrice,
      bookingId:      tx.id,
      customerEmail:  user.email,
      customerPhone:  user.phone ?? undefined,
      customerName:   `${user.firstName} ${user.lastName}`.trim(),
      returnUrl:      `${env.FRONTEND_URL ?? env.BACKEND_URL}/subscriptions?txId=${tx.id}`,
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { geniusPayTransactionId: reference, checkoutUrl },
    });

    return {
      requiresPayment: true,
      checkoutUrl,
      transactionId:   tx.id,
      plan:            input.plan,
      amount:          targetPlan.monthlyPrice,
      message:         `Réglez ${targetPlan.monthlyPrice.toLocaleString('fr-CI')} FCFA pour activer la formule ${targetPlan.name}.`,
    };
  },

  /**
   * Applique le changement de formule après validation du paiement Genius Pay.
   * Gère aussi la réactivation d'un abonnement suspendu.
   * Idempotent : aucune action si le plan cible est déjà actif et non suspendu.
   */
  async applyPaidPlanChange(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'subscription_payment' || !tx.subscriptionId) return;

    const targetPlanType = tx.notes;
    if (!targetPlanType || !PLAN_DETAILS[targetPlanType]) {
      logger.warn(`applyPaidPlanChange : plan cible invalide pour tx=${transactionId}`);
      return;
    }

    const sub = await prisma.subscription.findUnique({ where: { id: tx.subscriptionId } });
    if (!sub) return;

    // Déterminer le contexte : réactivation si l'abonnement était suspendu
    const isReactivation = sub.status === 'suspended';
    const context = isReactivation ? 'reactivation' : 'upgrade';

    if (sub.planType === targetPlanType && !isReactivation) return;

    // Avancer la date de facturation
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: addOneMonth(new Date()) },
    });

    // Recalculer tous les avantages via la méthode centralisée
    await updatePlanBenefits(sub.userId, targetPlanType, context);

    logger.info(`applyPaidPlanChange : ${sub.planType} → ${targetPlanType} [${context}] (sub=${sub.id})`);
  },

  async cancel(userId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement actif');
    return prisma.subscription.update({
      where: { userId },
      data: { status: 'cancelled', endDate: sub.nextBillingDate },
    });
  },

  async listInvoices(userId: string, page = 1, limit = 20) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement trouvé');

    const where = { subscriptionId: sub.id, type: 'subscription_payment' as const };
    const [data, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip:    (page - 1) * limit,
        take:    limit,
        orderBy: { initiatedAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);
    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // Liste les formules disponibles avec les capacités par type de compte
  async listPlans(accountType?: string) {
    return Object.entries(PLAN_DETAILS).map(([key, plan]) => ({
      key,
      name:               plan.name,
      monthlyPrice:       plan.monthlyPrice,
      commissionRate:     plan.commissionRate,
      publicationsLimit:  accountType === 'restaurateur' ? plan.includedMenusLimit : plan.includedPropertiesLimit,
      freeBoostsPerMonth: plan.freeBoostsPerMonth,
      boostDurationDays:  plan.boostDurationDays,
      videoUpload:        plan.videoUpload,
      virtualTour:        plan.virtualTour,
      verifiedBadge:      plan.verifiedBadge,
      premiumBadge:       plan.premiumBadge,
      visibilityBoostPct: plan.visibilityBoostPct,
      analytics:          plan.analytics,
      multiUser:          plan.multiUser,
      monthlyReport:      plan.monthlyReport,
      betaAccess:         plan.betaAccess,
      loyaltyProgram:     plan.loyaltyProgram,
      features:           plan.features,
    }));
  },
};
