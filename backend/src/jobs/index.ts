// Jobs registry — starts all cron jobs on application startup
import { startCleanupJob } from './cleanup.job';
import { startWebhookRecoveryJob } from './webhook-recovery.job';
import { startPendingPaymentExpiryJob } from './pending-payment-expiry.job';
import { startSubscriptionJob } from './subscription.job';
import { startBoostExpirationJob } from './boost-expiration.job';
import { startBoostResetJob } from './boost-reset.job';
import { startAdminReportJob } from './admin-report.job';
import { startCurrencyRatesJob } from './currency-rates.job';
import { startReferralRewardsJob } from './referral-rewards.job';
import { startMonitoringReportJob } from './monitoring-report.job';
import { startPayoutsJob } from './payouts.job';
import { startStayReminderJob } from './stay-reminder.job';
import { logger } from '../common/utils/logger';

export function startAllJobs(): void {
  logger.info('Starting background cron jobs...');
  startCleanupJob();                // daily 02:00 — cleanup audit logs + filet sécurité 24h
  startWebhookRecoveryJob();        // every hour :00 — poll Genius Pay stuck transactions
  startPendingPaymentExpiryJob();   // every hour :30 — expire unpaid bookings after 2h grace
  startSubscriptionJob();           // daily 00:00 — renewals, invoices, grace period
  startBoostExpirationJob();        // every hour — deactivate expired boosts
  startBoostResetJob();             // 1st of month 04:00 — reset free boost counters
  startAdminReportJob();            // every Sunday 03:00 — weekly activity report
  startCurrencyRatesJob();          // every hour — refresh exchange rates cache
  startReferralRewardsJob();        // daily 06:00 — reconcile pending referral rewards
  startMonitoringReportJob();       // daily 08:00 — monitoring health digest
  startPayoutsJob();                // daily 05:00 — reversements auto aux pros (net après frais GP)
  startStayReminderJob();           // daily 09:00 — rappel J-1 au client (push + in-app)
  logger.info('All cron jobs started');
}
