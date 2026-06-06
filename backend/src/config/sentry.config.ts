// Sentry error tracking — lazy-loaded only when DSN is configured
import { env } from './env.config';

export function initSentry(): void {
  if (!env.SENTRY_DSN) return;
  import('@sentry/node').then(Sentry => {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.NODE_ENV,
      tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  });
}
