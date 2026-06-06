// Daily analytics report job — platform summary sent to admin each morning
import cron from 'node-cron';
import { revenueAggregator } from '../aggregators/revenue.aggregator';
import { logger } from '../../../common/utils/logger';

export function startDailyReportJob(): void {
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running daily analytics report...');
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      const stats = await revenueAggregator.computePeriod(yesterday, endOfYesterday);
      logger.info(`Daily report — transactions: ${stats.transactionCount}, revenue: ${stats.totalRevenue} XOF`);
      // TODO: send summary email to admin via Brevo
    } catch (err) {
      logger.error('Daily report job failed', err);
    }
  });

  logger.info('Daily report job scheduled (daily at 08:00)');
}
