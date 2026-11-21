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
  globalLimitMax: env.RATE_LIMIT_GLOBAL_MAX, // 300 req/min par IP par défaut (RATE_LIMIT_GLOBAL_MAX)
} as const;
