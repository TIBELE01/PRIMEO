// Entry point — bootstraps the Express + Socket.io server
// IMPORTANT: instrument.ts must be the first import (initializes Sentry before anything else)
import './instrument';
import http from 'http';
import { createApp } from './app';
import { initSocketServer } from './modules/messaging/socket.server';
import { startAllJobs } from './jobs';
import { logger } from './common/utils/logger';
import { env, reportEnvReadiness } from './config/env.config';
import { validateSmtpConnection } from './common/utils/mailer';
import { initPlatformSettings } from './common/settings/platform-settings';

async function bootstrap(): Promise<void> {
  // Audit de configuration : signale les intégrations tierces incomplètes sans
  // bloquer le démarrage (les variables critiques DB/Supabase sont déjà validées
  // — et bloquantes — dans env.config.ts).
  reportEnvReadiness();

  const app = createApp();
  const server = http.createServer(app);

  // Socket.io server attached to the HTTP server
  initSocketServer(server);

  // Probe des services externes au démarrage (non-bloquant)
  validateSmtpConnection().catch(() => null);

  // Amorce le cache de configuration plateforme (overrides admin lus par le métier)
  // + rafraîchissement périodique. Non-bloquant : repli sur les constantes si échec.
  initPlatformSettings().catch(() => null);

  // Start all cron jobs
  startAllJobs();

  server.listen(env.PORT, () => {
    logger.info(`Primeo API running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`Swagger docs: ${env.BACKEND_URL}/api-docs`);
  });

  // Graceful shutdown
  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled rejection', reason);
    process.exit(1);
  });
}

bootstrap();
