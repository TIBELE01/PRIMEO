// Genius Pay payment gateway configuration (pay.genius.ci)
import { env } from './env.config';

export const geniusPayConfig = {
  apiKey: env.GENIUS_PAY_API_KEY,
  secretKey: env.GENIUS_PAY_SECRET_API_KEY,
  webhookSecret: env.GENIUS_PAY_WEBHOOK_SECRET,
  baseUrl: env.GENIUS_PAY_API_URL ?? 'https://pay.genius.ci/api/v1/merchant',
  currency: 'XOF',
  paymentOptions: {
    fullOnline: 'full_online',
    tenPercent: 'ten_percent_online',
    zeroOnline: 'zero_online',
  },
} as const;
