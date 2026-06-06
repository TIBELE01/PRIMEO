// ExchangeRate-API configuration — currency conversion (XOF base)
import { env } from './env.config';

export const exchangeRateConfig = {
  apiKey:      env.EXCHANGERATE_API_KEY,
  baseCurrency: 'XOF',
  baseUrl:     'https://v6.exchangerate-api.com/v6',
  cacheTtlSeconds: 24 * 60 * 60,                 // 24 h — matches daily cron refresh
  trackedCurrencies: ['EUR', 'USD'] as const,    // XOF → EUR and USD for indicative display
  supportedCurrencies: ['XOF', 'EUR', 'USD'] as const,
} as const;
