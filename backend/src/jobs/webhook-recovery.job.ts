// Webhook recovery cron job — polls Genius Pay for stuck pending transactions every hour
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { geniusPayService } from '../modules/payments/services/genius-pay.service';
import {
  handlePaymentSuccess,
  handlePaymentFailed,
} from '../modules/webhooks/handlers/genius-pay.handler';

const TEN_MINUTES_MS = 10 * 60 * 1000;

async function recoverPendingTransactions(): Promise<void> {
  const threshold = new Date(Date.now() - TEN_MINUTES_MS);

  const stuckTransactions = await prisma.transaction.findMany({
    where: {
      status: 'initiated',
      type: 'client_payment',
      geniusPayTransactionId: { not: null },
      initiatedAt: { lt: threshold },
    },
    select: {
      id: true,
      bookingId: true,
      geniusPayTransactionId: true,
      amount: true,
    },
  });

  if (stuckTransactions.length === 0) {
    logger.debug('Webhook recovery: no stuck transactions found');
    return;
  }

  logger.info(`Webhook recovery: checking ${stuckTransactions.length} stuck transaction(s)`);

  for (const tx of stuckTransactions) {
    const reference = tx.geniusPayTransactionId!;
    try {
      const status = await geniusPayService.getPaymentStatus(reference);

      logger.info(`Webhook recovery: reference=${reference} status=${status.status}`);

      if (status.status === 'success' || status.status === 'paid') {
        await handlePaymentSuccess({
          reference,
          amount: status.amount,
          recovered: true,
        });
      } else if (
        status.status === 'failed' ||
        status.status === 'cancelled' ||
        status.status === 'expired'
      ) {
        await handlePaymentFailed({
          reference,
          recovered: true,
        });
      } else {
        // Still pending — not yet expired, leave for next run
        logger.debug(`Webhook recovery: reference=${reference} still ${status.status}, skipping`);
      }
    } catch (err) {
      logger.error(`Webhook recovery: failed to process reference=${reference}`, err);
      // Continue to next transaction
    }
  }
}

export function startWebhookRecoveryJob(): void {
  // Run every hour at :00
  cron.schedule('0 * * * *', async () => {
    logger.info('Webhook recovery job started');
    try {
      await recoverPendingTransactions();
    } catch (err) {
      logger.error('Webhook recovery job failed', err);
    }
  });

  logger.info('Webhook recovery job scheduled (every hour)');
}
