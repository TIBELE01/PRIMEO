// Upstash Redis REST configuration — used for rate limiting and caching
import { env } from './env.config';

export const redisConfig = {
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
  redisUrl: env.REDIS_URL,
  // Rate limit windows
  authLimitWindow: 15 * 60, // 15 minutes in seconds
  authLimitMax: 5,
  globalLimitWindow: 60,    // 1 minute
  globalLimitMax: 100,
} as const;
