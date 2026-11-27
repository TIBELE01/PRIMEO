// Subscription renewal cron — daily midnight: charge, invoice, grace period, suspension
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import { sendEmail } from '../common/utils/mailer';
import { env } from '../config/env.config';
import { getPlanDetails, getGraceDays } from '../common/constants/subscription-plans';
import { notificationsService } from '../modules/notifications/notifications.service';
import { updatePlanBenefits } from '../modules/subscriptions/subscriptions.service';

const GRACE_PERIOD_DAYS = 7;

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

// Genius Pay n'expose pas de prélèvement serveur sur l'API marchand (POST /payments/charge
// répond 405) : le renouvellement passe par un lien de paiement envoyé au professionnel.
// Payé, le webhook applique le renouvellement (subscriptionsService.applyRenewalPayment).
// Un seul lien par période de 24 h ; le délai de grâce et la suspension restent inchangés.
export async function sendRenewalPaymentLink(
  sub: { id: string; userId: string; user: { email: string; firstName: string; lastName: string; phone?: string | null } },
  planType: string,
  planName: string,
  amount: number,
  opts: { force?: boolean } = {},
): Promise<string | null> {
  if (!sub.user.phone) return null; // Genius Pay exige un numéro de téléphone
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = opts.force ? null : await prisma.transaction.findFirst({
    where: { subscriptionId: sub.id, type: 'subscription_payment', status: 'initiated', notes: `renewal:${planType}`, initiatedAt: { gte: since } },
    select: { id: true },
  });
  if (recent) return null;
  const appUrl = env.FRONTEND_URL ?? 'https://app.primeo.ci';
  const { checkoutUrl, reference } = await geniusPayService.initiatePayment({
    amount,
    bookingId: sub.id,
    customerEmail: sub.user.email,
    customerPhone: sub.user.phone,
    customerName: `${sub.user.firstName} ${sub.user.lastName}`.trim(),
    returnUrl: appUrl,
    metadata: { subscription_id: sub.id, purpose: 'subscription_renewal' },
  });
  await prisma.transaction.create({
    data: {
      userId: sub.userId, subscriptionId: sub.id, type: 'subscription_payment', amount, fee: 0, netAmount: amount,
      status: 'initiated', geniusPayTransactionId: reference || null, notes: `renewal:${planType}`,
    },
  });
  await sendEmail({
    to: [{ email: sub.user.email, name: sub.user.firstName }],
    subject: `Renouvelez votre abonnement Primeo ${planName}`,
    htmlContent: `<div style="font-family:Arial,sans-serif;max-width:560px">
      <p>Bonjour ${sub.user.firstName},</p>
      <p>Votre abonnement <strong>${planName}</strong> arrive à échéance. Pour le renouveler
      (${amount.toLocaleString('fr-FR')} FCFA), réglez-le en Mobile Money ou par carte :</p>
      <p><a href="${checkoutUrl}" style="display:inline-block;background:#0055FF;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Payer mon abonnement</a></p>
      <p style="color:#5B6472;font-size:13px">Sans paiement, votre abonnement repassera en formule Starter à la fin du délai de grâce.</p>
    </div>`,
  });
  logger.info(`Lien de renouvellement envoyé (sub=${sub.id}, montant=${amount})`);
  return checkoutUrl;
}

async function processSubscriptionRenewal(sub: {
  id: string;
  userId: string;
  planType: string;
  monthlyPrice: number;
  nextBillingDate: Date;
  features: unknown;
  extraPublicationSlots: number;
  user: { email: string; firstName: string; lastName: string; phone?: string | null };
}): Promise<void> {
  // Apply pending plan change if any
  const features = (sub.features as Record<string, unknown> | null) ?? {};
  const pendingPlanType = features['pendingPlanType'] as string | undefined;

  let activePlanType = sub.planType;

  if (pendingPlanType) {
    const newPlan = getPlanDetails(pendingPlanType);
    if (newPlan) {
      activePlanType = pendingPlanType;
      // Déléguer à updatePlanBenefits pour recalcul cohérent des avantages
      await updatePlanBenefits(sub.userId, pendingPlanType, 'downgrade');
      logger.info(`Subscription ${sub.id}: downgrade applied ${sub.planType} → ${pendingPlanType}`);
    }
  }

  const plan = getPlanDetails(activePlanType);
  if (!plan) return;

  // Publications supplémentaires : applique les résiliations programmées à
  // l'échéance, puis facture les slots restants (500 FCFA/slot/mois) en plus
  // du prix de la formule.
  const EXTRA_SLOT_FCFA = 500;
  const pendingSlotRemoval = Number(features['pendingSlotRemoval'] ?? 0);
  const newSlots = Math.max(0, (sub.extraPublicationSlots ?? 0) - pendingSlotRemoval);
  const slotsCost = newSlots * EXTRA_SLOT_FCFA;
  const chargeAmount = plan.monthlyPrice + slotsCost;

  // Applique les changements de slots à l'échéance (retire les résiliés, ne les
  // refacture pas) — fusionne avec les features à jour en base.
  const applySlotChanges = async () => {
    const fresh = await prisma.subscription.findUnique({ where: { id: sub.id }, select: { features: true } });
    const f = ((fresh?.features as Record<string, unknown> | null) ?? {});
    delete f['pendingSlotRemoval'];
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { extraPublicationSlots: newSlots, features: f as never },
    });
  };

  // Rien à facturer (Starter sans slot) — on avance la date et on applique les slots.
  if (chargeAmount === 0) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: addOneMonth(sub.nextBillingDate) },
    });
    await applySlotChanges();
    return;
  }

  // Genius Pay n'offre pas de prélèvement automatique : le renouvellement passe par un lien
  // de paiement. Le délai de grâce est mesuré en jours depuis l'échéance (et non en nombre
  // d'exécutions de la tâche), ce qui reste exact même si une exécution est manquée.
  const graceDays = getGraceDays(GRACE_PERIOD_DAYS);
  const overdueDays = Math.floor((Date.now() - sub.nextBillingDate.getTime()) / 86_400_000);

  if (overdueDays >= graceDays) {
    // Fin du délai de grâce sans paiement : rétrogradation en Starter (formule d'origine
    // mémorisée dans features.suspendedFromPlan, annonces excédentaires suspendues).
    await updatePlanBenefits(sub.userId, 'starter', 'payment_failure');
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: addOneMonth(new Date()), extraPublicationSlots: 0 },
    });
    await prisma.transaction.create({
      data: {
        userId: sub.userId, subscriptionId: sub.id, type: 'subscription_payment', amount: chargeAmount,
        fee: 0, netAmount: chargeAmount, status: 'failed',
        notes: `Renouvellement ${plan.name} non réglé après ${graceDays} jours de grâce — rétrogradation Starter`,
      },
    });
    // Lien pour rétablir la formule perdue (un paiement = formule, avantages et annonces rétablis)
    await sendRenewalPaymentLink(sub, activePlanType, plan.name, plan.monthlyPrice, { force: true }).catch((err) =>
      logger.warn(`Restore payment link failed (sub=${sub.id})`, err),
    );
    logger.warn(`Subscription ${sub.id} auto-downgraded to Starter (${overdueDays} jours après l'échéance)`);
    return;
  }

  // Lien de paiement (un par 24 h au maximum)
  await sendRenewalPaymentLink(sub, activePlanType, plan.name, chargeAmount).catch((err) =>
    logger.warn(`Renewal payment link failed (sub=${sub.id})`, err),
  );

  if (overdueDays === 0) {
    // Jour de l'échéance : notification « paiement attendu » (email + push + SMS critique)
    notificationsService.notify({
      type: 'payment_failed',
      recipientId: sub.userId,
      data: { planName: plan.name },
    }).catch((err) => logger.warn(`payment_failed notify failed (sub=${sub.id})`, err));
  } else if (overdueDays === Math.max(1, graceDays - 3)) {
    notificationsService.notify({
      type: 'subscription_grace_warning',
      recipientId: sub.userId,
      data: { planName: plan.name, daysRemaining: graceDays - overdueDays },
    }).catch((err) => logger.warn(`Grace warning notify failed (sub=${sub.id})`, err));
  }
  logger.warn(`Subscription ${sub.id} en attente de paiement (jour ${overdueDays}/${graceDays})`);
}

type DueSubscription = Parameters<typeof processSubscriptionRenewal>[0];
const includeUser = { user: { select: { email: true, firstName: true, lastName: true, phone: true } } } as const;

/**
 * Passage quotidien : rappel J-3 avec lien de paiement, puis traitement des échéances
 * (lien, délai de grâce, rétrogradation). Idempotent — exécuté chaque nuit, au démarrage
 * du serveur (rattrapage si une exécution a été manquée) et à la demande par l'admin.
 */
export async function runSubscriptionRenewals(): Promise<{ reminders: number; due: number }> {
  const now = new Date();
  const inThreeDays = new Date(now.getTime() + 3 * 86_400_000);

  // Rappel avant échéance : un lien de paiement par abonnement payant, envoyé une fois à J-3
  const upcoming = await prisma.subscription.findMany({
    where: { status: 'active', monthlyPrice: { gt: 0 }, nextBillingDate: { gt: now, lte: inThreeDays } },
    include: includeUser,
  });
  let reminders = 0;
  for (const sub of upcoming) {
    const already = await prisma.transaction.findFirst({
      where: { subscriptionId: sub.id, type: 'subscription_payment', notes: { startsWith: 'renewal:' }, initiatedAt: { gte: new Date(sub.nextBillingDate.getTime() - 4 * 86_400_000) } },
      select: { id: true },
    });
    if (already) continue;
    const plan = getPlanDetails(sub.planType);
    if (!plan) continue;
    const amount = plan.monthlyPrice + (sub.extraPublicationSlots ?? 0) * 500;
    const url = await sendRenewalPaymentLink(sub, sub.planType, plan.name, amount).catch((err) => {
      logger.warn(`Renewal reminder failed (sub=${sub.id})`, err); return null;
    });
    if (url) reminders++;
  }

  const due = await prisma.subscription.findMany({
    where: { status: 'active', nextBillingDate: { lte: now } },
    include: includeUser,
  });
  for (const sub of due as DueSubscription[]) {
    try {
      await processSubscriptionRenewal(sub);
    } catch (err) {
      logger.error(`Subscription renewal failed for ${sub.id}`, err);
    }
  }
  logger.info(`Subscription renewals: ${reminders} rappel(s) J-3, ${due.length} échéance(s) traitée(s)`);
  return { reminders, due: due.length };
}

export function startSubscriptionJob(): void {
  // Chaque nuit à minuit
  cron.schedule('0 0 * * *', () => {
    runSubscriptionRenewals().catch((err) => logger.error('Subscription renewal job failed', err));
  });
  // Rattrapage au démarrage (hébergement mis en veille la nuit) — 2 min après le lancement
  setTimeout(() => {
    runSubscriptionRenewals().catch((err) => logger.error('Subscription renewal catch-up failed', err));
  }, 120_000).unref();

  logger.info('Subscription renewal job scheduled (daily at midnight + catch-up at startup)');
}
