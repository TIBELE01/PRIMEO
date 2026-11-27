// Sentry must be initialized before any other imports — do NOT move this file
import 'dotenv/config';
import * as Sentry from '@sentry/node';
import { redactSecrets } from './common/utils/redact';

const dsn = process.env['SENTRY_DSN'];
const environment = process.env['NODE_ENV'] ?? 'development';

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    enabled: true,
    tracesSampleRate: 0,
    beforeSend(event) {
      // Strip password fields from request bodies captured by Sentry
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        delete data['password'];
        delete data['currentPassword'];
        delete data['newPassword'];
        delete data['token'];
      }
      // Erreurs HTTP sortantes (axios) : pas de clé API ni d'en-tête d'authentification dans Sentry
      if (event.extra) event.extra = redactSecrets(event.extra) as typeof event.extra;
      if (event.contexts) event.contexts = redactSecrets(event.contexts) as typeof event.contexts;
      if (event.request?.headers) event.request.headers = redactSecrets(event.request.headers) as typeof event.request.headers;
      return event;
    },
  });
}
