// Prisma client configuration and connection settings
import { env } from './env.config';

export const databaseConfig = {
  url: env.DATABASE_URL,
  directUrl: env.DIRECT_URL,
  // Connection pool settings optimized for Supabase transaction pooler
  connectionLimit: env.NODE_ENV === 'production' ? 10 : 5,
} as const;
