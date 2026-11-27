// Subscription renewal cron — daily midnight: charge, invoice, grace period, suspension
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import { generateAndUploadInvoice } from '../common/utils/invoice';
import { sendTemplateEmail, sendEmail } from '../common/utils/mailer';
import { env } from '../config/env.config';
import { brevoConfig } from '../config/brevo.config';
import { getPlanDetails, getGraceDays } from '../common/constants/subscription-plans';
import { notificationsService } from '../modules/notifications/notifications.service';
import { updatePlanBenefits } from '../modules/subscriptions/subscriptions.service';

const GRACE_PERIOD_DAYS = 7;
// Avertissement envoyé à J-3 avant suspension (4ème échec = 3 jours restants)
const GRACE_WARNING_DAY = 4;

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
): Promise<string | null> {
  if (!sub.user.phone) return null; // Genius Pay exige un numéro de téléphone
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.transaction.findFirst({
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

  // Attempt direct charge via Genius Pay
  const charge = await geniusPayService.chargeRecurring({
    subscriptionId: sub.id,
    amount: chargeAmount,
    customerEmail: sub.user.email,
    customerPhone: sub.user.phone ?? undefined,
    description: `Abonnement Primeo ${plan.name}${newSlots > 0 ? ` + ${newSlots} publication(s) suppl.` : ''}`,
  });

  if (charge.success) {
    // Success — create transaction, advance billing date, generate invoice
    const newBillingDate = addOneMonth(sub.nextBillingDate);

    const tx = await prisma.transaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        type: 'subscription_payment',
        amount: chargeAmount,
        fee: 0,
        netAmount: chargeAmount,
        status: 'success',
        geniusPayTransactionId: charge.reference || null,
        completedAt: new Date(),
        notes: `Renouvellement ${plan.name}${newSlots > 0 ? ` + ${newSlots} publ. suppl.` : ''} — ${sub.nextBillingDate.toLocaleDateString('fr-CI')}`,
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: newBillingDate, status: 'active' },
    });
    // Applique les résiliations de slots programmées (retrait à l'échéance)
    await applySlotChanges();

    // Generate PDF invoice and upload to Cloudinary
    let invoiceUrl: string | undefined;
    try {
      invoiceUrl = await generateAndUploadInvoice({
        invoiceNumber: tx.id,
        invoiceDate: new Date(),
        periodStart: sub.nextBillingDate,
        periodEnd: newBillingDate,
        customerName: `${sub.user.firstName} ${sub.user.lastName}`,
        customerEmail: sub.user.email,
        planName: newSlots > 0 ? `${plan.name} + ${newSlots} publ. suppl.` : plan.name,
        amount: chargeAmount,
        isPaid: true,
      });

      await prisma.transaction.update({
        where: { id: tx.id },
        data: { notes: `${tx.notes} — Facture: ${invoiceUrl}` },
      });
    } catch (pdfErr) {
      logger.warn(`Invoice PDF generation failed for subscription ${sub.id}`, pdfErr);
    }

    // Send payment confirmation email
    await sendTemplateEmail(
      [{ email: sub.user.email, name: sub.user.firstName }],
      brevoConfig.templates.subscriptionRenewal,
      {
        firstName: sub.user.firstName,
        planName: newSlots > 0 ? `${plan.name} + ${newSlots} publ. suppl.` : plan.name,
        amount: chargeAmount.toLocaleString('fr-CI') + ' FCFA',
        nextBillingDate: newBillingDate.toLocaleDateString('fr-CI'),
        invoiceUrl: invoiceUrl ?? '',
      },
    ).catch((err) => logger.warn(`Renewal email failed for ${sub.user.email}`, err));

    logger.info(`Subscription ${sub.id} renewed successfully (${plan.name})`);
  } else {
    // Failure — record failed transaction
    await prisma.transaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        type: 'subscription_payment',
        amount: chargeAmount,
        fee: 0,
        netAmount: chargeAmount,
        status: 'failed',
        notes: `Échec renouvellement: ${charge.error ?? 'unknown'}`,
      },
    });

    // Lien de paiement Genius Pay pour régulariser (renouvellement par paiement en ligne)
    await sendRenewalPaymentLink(sub, activePlanType, plan.name, chargeAmount).catch((err) =>
      logger.warn(`Renewal payment link failed (sub=${sub.id})`, err),
    );
    // Notification immédiate de l'échec (email + push + SMS critique — cf. CHANNEL_CONFIG)
    notificationsService.notify({
      type: 'payment_failed',
      recipientId: sub.userId,
      data: { planName: plan.name },
    }).catch((err) => logger.warn(`payment_failed notify failed (sub=${sub.id})`, err));

    // Délai de grâce configurable (override admin), repli sur la constante.
    const graceDays = getGraceDays(GRACE_PERIOD_DAYS);
    // Count consecutive failures in the last `graceDays` days
    const gracePeriodStart = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);

    const [failedCount, successCount] = await Promise.all([
      prisma.transaction.count({
        where: {
          subscriptionId: sub.id,
          type: 'subscription_payment',
          status: 'failed',
          initiatedAt: { gte: gracePeriodStart },
        },
      }),
      prisma.transaction.count({
        where: {
          subscriptionId: sub.id,
          type: 'subscription_payment',
          status: 'success',
          initiatedAt: { gte: gracePeriodStart },
        },
      }),
    ]);

    if (failedCount >= graceDays && successCount === 0) {
      // Rétrograder vers Starter via updatePlanBenefits (stocke suspendedFromPlan dans features)
      await updatePlanBenefits(sub.userId, 'starter', 'payment_failure');

      logger.warn(`Subscription ${sub.id} auto-downgraded to Starter after ${graceDays} payment failures`);
    } else if (failedCount === GRACE_WARNING_DAY && successCount === 0) {
      // Avertissement J-3 avant suspension
      const daysRemaining = graceDays - failedCount;
      notificationsService.notify({
        type: 'subscription_grace_warning',
        recipientId: sub.userId,
        data: { planName: plan.name, daysRemaining },
      }).catch((err) => logger.warn(`Grace warning notify failed (sub=${sub.id})`, err));

      logger.warn(`Subscription ${sub.id} grace warning sent (${daysRemaining} days left)`);
    } else {
      logger.warn(`Subscription ${sub.id} payment failed (attempt ${failedCount}/${graceDays})`);
    }
  }
}

export function startSubscriptionJob(): void {
  // Daily at midnight — subscription renewals
  cron.schedule('0 0 * * *', async () => {
    logger.info('Subscription renewal job started');
    try {
      const now = new Date();

      // Trouve tous les abonnements actifs en cours de renouvellement (y compris Starter gratuit)
      const due = await prisma.subscription.findMany({
        where: {
          status:          'active',
          nextBillingDate: { lte: now },
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true, phone: true } },
        },
      });

      logger.info(`Subscription renewal: ${due.length} subscription(s) due`);

      for (const sub of due) {
        try {
          await processSubscriptionRenewal(sub);
        } catch (err) {
          logger.error(`Subscription renewal failed for ${sub.id}`, err);
        }
      }
    } catch (err) {
      logger.error('Subscription renewal job failed', err);
    }
  });

  logger.info('Subscription renewal job scheduled (daily at midnight)');
}
