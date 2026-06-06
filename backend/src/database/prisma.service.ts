// Singleton Prisma client — shared across all repositories
import { PrismaClient } from '@prisma/client';
import { logger } from '../common/utils/logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Explicit runtime URL — forces use of DATABASE_URL (pooler + pgbouncer=true)
    // instead of falling back to whatever schema.prisma resolves at compile time.
    // DIRECT_URL in schema.prisma is used only by `prisma migrate` CLI, not here.
    datasources: { db: { url: process.env['DATABASE_URL'] } },
    log:
      process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'query' }, { emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'error' }],
  });

// Persist singleton across module reloads (dev hot-reload + serverless warm starts)
globalForPrisma.prisma = prisma;

// $on('error') is only available when 'error' is listed in log config
(prisma as any).$on('error', (e: any) => {
  logger.error('Prisma error', { message: e.message, target: e.target });
});
