// Subscriptions service — activation, montées en gamme, renouvellements, historique factures
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { PLAN_DETAILS, getPlanDetails, isPlanActive, getPublicationLimit, EXTRA_PUBLICATION_SLOT_FCFA } from '../../common/constants/subscription-plans';
import { UpgradePlanInput } from './dto/subscription.dto';
import { geniusPayService } from '../payments/services/genius-pay.service';
import { notificationsService } from '../notifications/notifications.service';
import { env } from '../../config/env.config';
import { logger } from '../../common/utils/logger';
import { Decimal } from '@prisma/client/runtime/library';
import { generateAndUploadInvoice } from '../../common/utils/invoice';

// Contexte d'un recalcul d'avantages
export type BenefitUpdateContext =
  | 'upgrade'
  | 'downgrade'
  | 'admin_force'
  | 'payment_failure'
  | 'reactivation';

function planConfig(planType: string) {
  const plan = getPlanDetails(planType);
  if (!plan) throw new Error(`Unknown plan: ${planType}`);
  return plan;
}

// Montant minimal accepté par Genius Pay (XOF)
const GENIUS_PAY_MIN_XOF = 200;

/**
 * Applique un code promo (créé dans l'admin) à un montant d'abonnement.
 * Mêmes règles que pour les réservations : actif, dans sa période de validité,
 * sous sa limite d'utilisation et au-dessus de son montant minimum.
 */
export async function resolveSubscriptionPromo(code: string | undefined, baseAmount: number) {
  if (!code) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!promo || !promo.isActive) throw new HttpError(400, 'Code promo invalide ou inactif');
  const now = new Date();
  if (now < promo.validFrom || now > promo.validUntil) throw new HttpError(400, 'Ce code promo a expiré ou n\'est pas encore actif');
  if (promo.maxUses !== null && promo.usesCount >= promo.maxUses) throw new HttpError(400, 'Ce code promo a atteint sa limite d\'utilisation');
  if (promo.minAmount !== null && baseAmount < promo.minAmount) {
    throw new HttpError(400, `Ce code promo nécessite un montant minimum de ${promo.minAmount} FCFA`);
  }
  const raw = promo.discountType === 'percent' ? Math.floor((baseAmount * promo.discountValue) / 100) : promo.discountValue;
  const discount = Math.min(raw, baseAmount);
  return { id: promo.id, code: promo.code, discount };
}

/**
 * Note d'une transaction de changement de formule : « upgrade:<plan>:<full|prorata>[:promo=<id>] — libellé ».
 * Les anciennes notes (« business » ou « business — proraté 20j/30 ») restent reconnues.
 */
export function parseUpgradeNote(notes: string | null | undefined): { plan: string; mode: 'full' | 'prorata'; promoId?: string } | null {
  const m = (notes ?? '').match(/^(?:upgrade:)?(starter|business|entreprise)(?::(full|prorata))?(?::promo=([A-Za-z0-9_-]+))?/);
  if (!m) return null;
  const legacyProrata = !m[2] && /proraté/.test(notes ?? '');
  return { plan: m[1], mode: (m[2] as 'full' | 'prorata') ?? (legacyProrata ? 'prorata' : 'full'), promoId: m[3] };
}

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// Normalise un abonnement pour le mobile : expose `plan`, `renewalDate`, `monthlyCost`,
// `pendingPlan` et les capacités dérivées du plan actif.
function serializeSubscription<T extends Record<string, unknown>>(sub: T | null): (T & {
  plan: unknown;
  renewalDate: unknown;
  monthlyCost: unknown;
  pendingPlan: string | null;
  lapsedPlan: string | null;
  suspendedListings: number;
}) | null {
  if (!sub) return null;
  const features = (sub.features as Record<string, unknown> | null) ?? {};
  const planType = sub.planType as string;
  const planDef  = getPlanDetails(planType) ?? {};
  return {
    ...sub,
    plan:         planType,
    renewalDate:  sub.nextBillingDate,
    monthlyCost:  sub.monthlyPrice,
    pendingPlan:  (features['pendingPlanType'] as string | undefined) ?? null,
    // Formule perdue faute de paiement (rétablie dès le paiement du renouvellement)
    lapsedPlan:   (features['suspendedFromPlan'] as string | undefined) ?? null,
    suspendedListings: Array.isArray(features['downgradeSuspendedIds']) ? (features['downgradeSuspendedIds'] as unknown[]).length : 0,
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
  const newPlan = getPlanDetails(newPlanType);
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
      // Mémorise les annonces suspendues par la formule : seules celles-ci seront
      // réactivées au renouvellement (jamais une annonce suspendue par la modération).
      const prev = Array.isArray(newFeatures['downgradeSuspendedIds']) ? (newFeatures['downgradeSuspendedIds'] as string[]) : [];
      newFeatures['downgradeSuspendedIds'] = [...new Set([...prev, ...excess.map((p) => p.id)])];
      await prisma.subscription.update({ where: { id: sub.id }, data: { features: newFeatures as never } });
      logger.warn(
        `updatePlanBenefits [${context}]: ${excess.length} annonce(s) suspendues (userId=${userId}, plan=${newPlanType})`,
      );
    }
  }

  // Réactivation (renouvellement / montée en gamme) : uniquement les annonces suspendues
  // par une rétrogradation, dans la limite de publications de la nouvelle formule.
  let reactivatedCount = 0;
  if (context === 'reactivation' || context === 'upgrade' || context === 'admin_force') {
    const ids = Array.isArray(newFeatures['downgradeSuspendedIds']) ? (newFeatures['downgradeSuspendedIds'] as string[]) : [];
    if (ids.length) {
      const activeCount = await prisma.property.count({ where: { ownerId: userId, status: 'active' } });
      const room = Math.max(0, pubLimit + (sub.extraPublicationSlots ?? 0) - activeCount);
      const toReactivate = ids.slice(0, room);
      if (toReactivate.length) {
        const r = await prisma.property.updateMany({
          where: { id: { in: toReactivate }, ownerId: userId, status: 'suspended' },
          data: { status: 'active' as never },
        });
        reactivatedCount = r.count;
      }
      const remaining = ids.filter((id) => !toReactivate.includes(id));
      if (remaining.length) newFeatures['downgradeSuspendedIds'] = remaining; else delete newFeatures['downgradeSuspendedIds'];
      await prisma.subscription.update({ where: { id: sub.id }, data: { features: newFeatures as never } });
      logger.info(`updatePlanBenefits [${context}]: ${reactivatedCount} annonce(s) réactivée(s) (userId=${userId})`);
    }
  }

  // Notification multi-canal
  const prevPlanName = getPlanDetails(previousPlan)?.name ?? previousPlan;
  const newPlanName = newPlan.name;

  const adminUp = context === 'admin_force' && newPlan.monthlyPrice > (getPlanDetails(previousPlan)?.monthlyPrice ?? 0);
  const notifType =
    context === 'admin_force'      ? (adminUp ? 'subscription_upgraded' : 'subscription_downgraded') :
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
      reactivatedCount: reactivatedCount > 0 ? reactivatedCount : undefined,
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
        new: { plan: newPlanType, suspendedCount: suspendedProperties.length, reactivatedCount },
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
    if (!isPlanActive(input.plan)) throw new HttpError(400, "Cette formule n'est pas disponible actuellement.");

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

    // Montant :
    // - depuis Starter, ou abonnement échu / rétrogradé pour défaut de paiement : plein
    //   tarif de la formule, nouvelle période d'un mois à partir du paiement ;
    // - entre deux formules payantes en cours de période : différence au prorata des
    //   jours restants, la date d'échéance est conservée.
    const now = new Date();
    const subFeatures = (sub.features as Record<string, unknown> | null) ?? {};
    const lapsed = sub.status === 'suspended' || !!subFeatures['suspendedFromPlan'] || sub.nextBillingDate.getTime() <= now.getTime();
    const mode: 'full' | 'prorata' = sub.monthlyPrice <= 0 || lapsed ? 'full' : 'prorata';
    const daysRemaining = Math.max(
      1,
      Math.ceil((sub.nextBillingDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );
    const baseAmount = mode === 'full'
      ? targetPlan.monthlyPrice
      : Math.max(1, Math.round((targetPlan.monthlyPrice - sub.monthlyPrice) * daysRemaining / 30));
    const promo = await resolveSubscriptionPromo(input.promoCode, baseAmount);
    const discount = promo?.discount ?? 0;
    let amount = baseAmount - discount;
    if (amount > 0 && amount < GENIUS_PAY_MIN_XOF) amount = GENIUS_PAY_MIN_XOF;
    const label = mode === 'full' ? `Abonnement ${targetPlan.name}` : `${targetPlan.name} — proraté ${daysRemaining}j/30`;
    const note = `upgrade:${input.plan}:${mode}${promo ? `:promo=${promo.id}` : ''} — ${label}${promo ? ` (code ${promo.code} −${discount} FCFA)` : ''}`;

    const tx = await prisma.transaction.create({
      data: {
        userId,
        subscriptionId: sub.id,
        type:           'subscription_payment',
        amount,
        fee:            0,
        netAmount:      amount,
        status:         amount === 0 ? 'success' : 'initiated',
        ...(amount === 0 ? { completedAt: now } : {}),
        notes:          note,
      },
    });

    // Code promo couvrant 100 % : la formule est activée sans passer par le paiement
    if (amount === 0) {
      await subscriptionsService.applyPaidPlanChange(tx.id);
      return {
        requiresPayment: false,
        activated:       true,
        plan:            input.plan,
        amount:          0,
        originalAmount:  baseAmount,
        discount,
        message:         `Formule ${targetPlan.name} activée (code ${promo?.code}).`,
      };
    }

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount,
      bookingId:      tx.id,
      customerEmail:  user.email,
      customerPhone:  user.phone ?? undefined,
      customerName:   `${user.firstName} ${user.lastName}`.trim(),
      returnUrl:      `${env.FRONTEND_URL ?? env.BACKEND_URL}/subscriptions?txId=${tx.id}`,
      metadata:       { subscription_id: sub.id, purpose: 'subscription_upgrade', plan: input.plan },
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
      amount,
      originalAmount:  baseAmount,
      discount,
      mode,
      daysRemaining:   mode === 'prorata' ? daysRemaining : undefined,
      message:         mode === 'prorata'
        ? `Réglez ${amount.toLocaleString('fr-CI')} FCFA (${daysRemaining} jours restants) pour activer la formule ${targetPlan.name}.`
        : `Réglez ${amount.toLocaleString('fr-CI')} FCFA pour activer la formule ${targetPlan.name} pour un mois.`,
    };
  },

  /**
   * Applique le changement de formule après validation du paiement Genius Pay.
   * Gère aussi la réactivation d'un abonnement suspendu.
   * Idempotent : aucune action si le plan cible est déjà actif et non suspendu.
   */
  /**
   * Renouvellement payé par lien (transaction « renewal:<plan> ») : prolonge l'abonnement
   * d'un mois à partir de l'échéance (ou d'aujourd'hui si elle est dépassée de plus de
   * 7 jours) et rétablit la formule si elle avait été rétrogradée pendant le délai de grâce.
   */
  async applyRenewalPayment(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'subscription_payment' || !tx.subscriptionId) return;
    const planType = (tx.notes ?? '').replace(/^renewal:/, '');
    if (!PLAN_DETAILS[planType]) { logger.warn(`applyRenewalPayment : plan invalide (tx=${transactionId})`); return; }
    const sub = await prisma.subscription.findUnique({ where: { id: tx.subscriptionId } });
    if (!sub) return;
    const now = new Date();
    const lapsed = sub.planType !== planType || sub.status === 'suspended';
    // Formule rétablie après rétrogradation : nouvelle période à partir du paiement.
    // Renouvellement à temps : la période suivante démarre à l'échéance.
    const base = !lapsed && sub.nextBillingDate.getTime() > now.getTime() - 7 * 86_400_000 ? sub.nextBillingDate : now;
    const periodEnd = addOneMonth(base);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: periodEnd, status: 'active' },
    });
    const restored = lapsed;
    if (restored) {
      // Formule rétrogradée pendant le délai de grâce : rétablie avec ses avantages et ses annonces
      await updatePlanBenefits(sub.userId, planType, 'reactivation');
    }

    // Facture + confirmation (email, push, in-app)
    const plan = getPlanDetails(planType);
    const user = await prisma.user.findUnique({ where: { id: sub.userId }, select: { email: true, firstName: true, lastName: true } });
    let invoiceUrl = '';
    if (user) {
      invoiceUrl = await generateAndUploadInvoice({
        invoiceNumber: tx.id, invoiceDate: now, periodStart: base, periodEnd,
        customerName: `${user.firstName} ${user.lastName}`.trim(), customerEmail: user.email,
        planName: plan?.name ?? planType, amount: tx.amount, isPaid: true,
      }).catch((err) => { logger.warn(`applyRenewalPayment : facture non générée (tx=${tx.id})`, err); return ''; });
    }
    notificationsService.notify({
      type: 'subscription_renewal',
      recipientId: sub.userId,
      data: {
        planName: plan?.name ?? planType,
        amount: `${tx.amount.toLocaleString('fr-FR')} FCFA`,
        nextBillingDate: periodEnd.toLocaleDateString('fr-FR'),
        invoiceUrl,
      },
    }).catch((err) => logger.warn(`applyRenewalPayment : notification échouée (sub=${sub.id})`, err));
    logger.info(`applyRenewalPayment : abonnement ${planType} renouvelé jusqu'au ${periodEnd.toISOString().slice(0, 10)}${restored ? ' (formule rétablie)' : ''} (sub=${sub.id})`);
  },

  async applyPaidPlanChange(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'subscription_payment' || !tx.subscriptionId) return;

    const parsed = parseUpgradeNote(tx.notes);
    const targetPlanType = parsed?.plan;
    if (!targetPlanType || !PLAN_DETAILS[targetPlanType]) {
      logger.warn(`applyPaidPlanChange : plan cible invalide pour tx=${transactionId}`);
      return;
    }

    const sub = await prisma.subscription.findUnique({ where: { id: tx.subscriptionId } });
    if (!sub) return;

    // Réactivation : abonnement suspendu ou rétrogradé pour défaut de paiement
    const feats = (sub.features as Record<string, unknown> | null) ?? {};
    const isReactivation = sub.status === 'suspended' || !!feats['suspendedFromPlan'];
    const context = isReactivation ? 'reactivation' : 'upgrade';

    if (sub.planType === targetPlanType && !isReactivation) return;

    // Plein tarif : nouvelle période d'un mois. Prorata : l'échéance en cours est conservée.
    if (parsed.mode === 'full') {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { nextBillingDate: addOneMonth(new Date()), status: 'active' },
      });
    }
    if (parsed.promoId) {
      await prisma.promoCode.update({ where: { id: parsed.promoId }, data: { usesCount: { increment: 1 } } })
        .catch((err) => logger.warn(`applyPaidPlanChange : compteur du code promo non mis à jour (tx=${transactionId})`, err));
    }

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

  // ── Publications supplémentaires (500 FCFA / slot / mois) ─────────────────────

  // Synthèse des slots : limite de base, slots actifs, limite effective, coût,
  // et résiliations programmées pour la prochaine échéance.
  async getSlotsInfo(userId: string) {
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement actif');
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } });
    const baseLimit = getPublicationLimit(sub.planType, user?.accountType ?? '');
    const extraSlots = sub.extraPublicationSlots ?? 0;
    const features = (sub.features as Record<string, unknown> | null) ?? {};
    const pendingRemoval = Number(features['pendingSlotRemoval'] ?? 0);
    return {
      baseLimit,
      extraSlots,
      effectiveLimit: baseLimit + extraSlots,
      pricePerSlotFcfa: EXTRA_PUBLICATION_SLOT_FCFA,
      monthlySlotsCostFcfa: extraSlots * EXTRA_PUBLICATION_SLOT_FCFA,
      pendingRemoval,
      nextBillingDate: sub.nextBillingDate,
    };
  },

  // Achat de N slots : paiement Genius Pay AU PRORATA du mois en cours, puis
  // renouvellement tacite mensuel (cf. cron). Les slots sont activés à la
  // validation du paiement (webhook → activatePurchasedSlots).
  async purchaseSlots(userId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new HttpError(400, 'Quantité de publications supplémentaires invalide (1 à 100).');
    }
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement actif');
    if (sub.status === 'cancelled') throw new HttpError(400, 'Abonnement annulé — contactez le support');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true, lastName: true, phone: true },
    });
    if (!user) throw new HttpError(404, 'Utilisateur introuvable');
    if (!user.phone) throw new HttpError(400, 'Ajoutez un numéro de téléphone à votre profil pour régler vos publications supplémentaires.');

    // Prorata du mois en cours (jours restants, aujourd'hui inclus)
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - now.getDate() + 1;
    const fullMonth = quantity * EXTRA_PUBLICATION_SLOT_FCFA;
    const proratedAmount = Math.max(1, Math.round(fullMonth * daysRemaining / daysInMonth));

    const tx = await prisma.transaction.create({
      data: {
        userId,
        subscriptionId: sub.id,
        type: 'subscription_payment',
        amount: proratedAmount,
        fee: 0,
        netAmount: proratedAmount,
        status: 'initiated',
        notes: `extra_slots:${quantity}`, // marqueur routé par le webhook
      },
    });

    const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
      amount: proratedAmount,
      bookingId: tx.id,
      customerEmail: user.email,
      customerPhone: user.phone ?? undefined,
      customerName: `${user.firstName} ${user.lastName}`.trim(),
      returnUrl: `${env.FRONTEND_URL ?? env.BACKEND_URL}/subscriptions?slotsTx=${tx.id}`,
    });

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { geniusPayTransactionId: reference, checkoutUrl },
    });

    return {
      requiresPayment: true,
      checkoutUrl,
      transactionId: tx.id,
      quantity,
      proratedAmount,
      fullMonthAmount: fullMonth,
      message: `Réglez ${proratedAmount.toLocaleString('fr-CI')} FCFA (prorata du mois) pour activer ${quantity} publication(s) supplémentaire(s).`,
    };
  },

  // Webhook : active les slots achetés après validation du paiement Genius Pay.
  // Idempotent via le court-circuit "tx déjà success" du handler.
  async activatePurchasedSlots(transactionId: string): Promise<void> {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.type !== 'subscription_payment' || !tx.subscriptionId) return;
    const match = /^extra_slots:(\d+)$/.exec(tx.notes ?? '');
    if (!match) return;
    const quantity = parseInt(match[1], 10);
    if (!quantity) return;

    await prisma.subscription.update({
      where: { id: tx.subscriptionId },
      data: { extraPublicationSlots: { increment: quantity } },
    });
    logger.info(`Slots activés : +${quantity} (sub=${tx.subscriptionId}, tx=${transactionId})`);
  },

  // Statut d'une transaction d'achat de slots — pour polling côté mobile.
  async getSlotTransactionStatus(transactionId: string, userId: string) {
    const tx = await prisma.transaction.findUnique({ where: { id: transactionId } });
    if (!tx || tx.userId !== userId) throw new HttpError(404, 'Transaction introuvable');
    if (!/^extra_slots:/.test(tx.notes ?? '')) throw new HttpError(400, 'Transaction non éligible');
    return { status: tx.status, transactionId: tx.id };
  },

  // Résiliation de N slots — effet à la prochaine échéance (ils restent utilisables
  // jusqu'au renouvellement, où ils sont retirés et non refacturés).
  async cancelSlots(userId: string, quantity: number) {
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new HttpError(400, 'Quantité invalide.');
    }
    const sub = await prisma.subscription.findUnique({ where: { userId } });
    if (!sub) throw new HttpError(404, 'Aucun abonnement actif');
    const active = sub.extraPublicationSlots ?? 0;
    if (active === 0) throw new HttpError(400, 'Aucune publication supplémentaire à résilier.');

    const features = (sub.features as Record<string, unknown> | null) ?? {};
    const currentPending = Number(features['pendingSlotRemoval'] ?? 0);
    const pendingRemoval = Math.min(active, currentPending + quantity);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { features: { ...features, pendingSlotRemoval: pendingRemoval } as never },
    });

    return {
      scheduled: true,
      pendingRemoval,
      effectiveDate: sub.nextBillingDate,
      message: `${pendingRemoval} publication(s) supplémentaire(s) seront retirées le ${sub.nextBillingDate.toLocaleDateString('fr-CI')}.`,
    };
  },

  // Liste les formules disponibles avec les capacités par type de compte
  async listPlans(accountType?: string) {
    // On masque les formules désactivées par l'admin (Starter reste toujours
    // disponible car c'est la formule gratuite par défaut). Les prix/limites/
    // fonctionnalités reflètent les overrides admin via getPlanDetails().
    return Object.keys(PLAN_DETAILS)
      .filter((key) => key === 'starter' || isPlanActive(key))
      .map((key) => {
      const plan = getPlanDetails(key);
      return {
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
      active:             isPlanActive(key),
      };
    });
  },
};
