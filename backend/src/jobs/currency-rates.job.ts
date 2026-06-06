// Daily exchange-rate refresh — fetches XOF → EUR/USD from ExchangeRate-API
// Stores in Redis (TTL 24 h) and persists to DB for resilience.
import cron from 'node-cron';
import { refreshExchangeRates } from '../common/utils/currency';
import { logger } from '../common/utils/logger';

async function runRefresh(): Promise<void> {
  try {
    const rates = await refreshExchangeRates();
    if (rates) {
      logger.info(`Currency rates refreshed: ${JSON.stringify(rates.rates)} (source=${rates.source})`);
    } else {
      logger.warn('Currency rates refresh returned no data');
    }
  } catch (err) {
    logger.warn('Currency rates refresh failed', err);
  }
}

export function startCurrencyRatesJob(): void {
  // Daily at 06:00 UTC — aligned with ExchangeRate-API's daily update window
  cron.schedule('0 6 * * *', runRefresh);
  logger.info('Currency rates job scheduled (daily 06:00 UTC)');

  // Warm up on startup so the endpoint is immediately usable
  runRefresh();
}
