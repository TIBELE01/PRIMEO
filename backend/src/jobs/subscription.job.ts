// Subscription renewal cron — daily midnight: charge, invoice, grace period, suspension
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import { generateAndUploadInvoice } from '../common/utils/invoice';
import { sendTemplateEmail } from '../common/utils/mailer';
import { brevoConfig } from '../config/brevo.config';
import { PLAN_DETAILS } from '../common/constants/subscription-plans';
import { notificationsService } from '../modules/notifications/notifications.service';
import { updatePlanBenefits } from '../modules/subscriptions/subscriptions.service';
import { Decimal } from '@prisma/client/runtime/library';

const GRACE_PERIOD_DAYS = 7;
// Avertissement envoyé à J-3 avant suspension (4ème échec = 3 jours restants)
const GRACE_WARNING_DAY = 4;

function addOneMonth(date: Date): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return d;
}

async function processSubscriptionRenewal(sub: {
  id: string;
  userId: string;
  planType: string;
  monthlyPrice: number;
  nextBillingDate: Date;
  features: unknown;
  user: { email: string; firstName: string; lastName: string; phone?: string | null };
}): Promise<void> {
  // Apply pending plan change if any
  const features = (sub.features as Record<string, unknown> | null) ?? {};
  const pendingPlanType = features['pendingPlanType'] as string | undefined;

  let activePlanType = sub.planType;
  const newFeatures = { ...features };

  if (pendingPlanType) {
    const newPlan = PLAN_DETAILS[pendingPlanType];
    if (newPlan) {
      activePlanType = pendingPlanType;
      // Déléguer à updatePlanBenefits pour recalcul cohérent des avantages
      await updatePlanBenefits(sub.userId, pendingPlanType, 'downgrade');
      logger.info(`Subscription ${sub.id}: downgrade applied ${sub.planType} → ${pendingPlanType}`);
    }
  }

  const plan = PLAN_DETAILS[activePlanType];
  if (!plan) return;

  // Starter est gratuit — on avance simplement la date de facturation
  if (plan.monthlyPrice === 0) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: addOneMonth(sub.nextBillingDate) },
    });
    return;
  }

  // Attempt direct charge via Genius Pay
  const charge = await geniusPayService.chargeRecurring({
    subscriptionId: sub.id,
    amount: plan.monthlyPrice,
    customerEmail: sub.user.email,
    customerPhone: sub.user.phone ?? undefined,
    description: `Abonnement Primeo ${plan.name}`,
  });

  if (charge.success) {
    // Success — create transaction, advance billing date, generate invoice
    const newBillingDate = addOneMonth(sub.nextBillingDate);

    const tx = await prisma.transaction.create({
      data: {
        userId: sub.userId,
        subscriptionId: sub.id,
        type: 'subscription_payment',
        amount: plan.monthlyPrice,
        fee: 0,
        netAmount: plan.monthlyPrice,
        status: 'success',
        geniusPayTransactionId: charge.reference || null,
        completedAt: new Date(),
        notes: `Renouvellement ${plan.name} — ${sub.nextBillingDate.toLocaleDateString('fr-CI')}`,
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { nextBillingDate: newBillingDate, status: 'active' },
    });

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
        planName: plan.name,
        amount: plan.monthlyPrice,
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
        planName: plan.name,
        amount: plan.monthlyPrice.toLocaleString('fr-CI') + ' FCFA',
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
        amount: plan.monthlyPrice,
        fee: 0,
        netAmount: plan.monthlyPrice,
        status: 'failed',
        notes: `Échec renouvellement: ${charge.error ?? 'unknown'}`,
      },
    });

    // Count consecutive failures in the last GRACE_PERIOD_DAYS days
    const gracePeriodStart = new Date(Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

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

    if (failedCount >= GRACE_PERIOD_DAYS && successCount === 0) {
      // Rétrograder vers Starter via updatePlanBenefits (stocke suspendedFromPlan dans features)
      await updatePlanBenefits(sub.userId, 'starter', 'payment_failure');

      logger.warn(`Subscription ${sub.id} auto-downgraded to Starter after ${GRACE_PERIOD_DAYS} payment failures`);
    } else if (failedCount === GRACE_WARNING_DAY && successCount === 0) {
      // Avertissement J-3 avant suspension
      const daysRemaining = GRACE_PERIOD_DAYS - failedCount;
      notificationsService.notify({
        type: 'subscription_grace_warning',
        recipientId: sub.userId,
        data: { planName: plan.name, daysRemaining },
      }).catch((err) => logger.warn(`Grace warning notify failed (sub=${sub.id})`, err));

      logger.warn(`Subscription ${sub.id} grace warning sent (${daysRemaining} days left)`);
    } else {
      logger.warn(`Subscription ${sub.id} payment failed (attempt ${failedCount}/${GRACE_PERIOD_DAYS})`);
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
