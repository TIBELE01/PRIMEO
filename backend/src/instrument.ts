// Sentry must be initialized before any other imports — do NOT move this file
import 'dotenv/config';
import * as Sentry from '@sentry/node';

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
      return event;
    },
  });
}
