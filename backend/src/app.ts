// Express application factory — registers all middleware and routes
import express, { Application, Request, Response } from 'express';
import * as Sentry from '@sentry/node';
import { applyHelmet } from './common/middleware/helmet.middleware';
import { applyCors } from './common/middleware/cors.middleware';
import { applyCompression } from './common/middleware/compression.middleware';
import { applyLogger } from './common/middleware/logger.middleware';
import { applyRateLimit } from './common/middleware/rate-limit.middleware';
import { applyRawBody } from './common/middleware/raw-body.middleware';
import { applyRequestId } from './common/middleware/request-id.middleware';
import { handleHttpError } from './common/handlers/http-error.handler';
import { handlePrismaError } from './common/handlers/prisma-error.handler';
import { env } from './config/env.config';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.config';

// Module routers
import { authRouter } from './modules/auth/auth.router';
import { usersRouter } from './modules/users/users.router';
import { propertiesRouter } from './modules/properties/properties.router';
import { bookingsRouter } from './modules/bookings/bookings.router';
import { paymentsRouter } from './modules/payments/payments.router';
import { availabilitiesRouter } from './modules/availabilities/availabilities.router';
import { reviewsRouter } from './modules/reviews/reviews.router';
import { messagesRouter } from './modules/messaging/messaging.router';
import { notificationsRouter } from './modules/notifications/notifications.router';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.router';
import { professionalRouter } from './modules/professional/professional.router';
import { adminRouter } from './modules/admin/admin.router';
import { adminAuthRouter } from './modules/admin/admin-auth.router';
import { boostsRouter } from './modules/boosts/boosts.router';
import { disputesRouter } from './modules/disputes/disputes.router';
import { analyticsRouter } from './modules/analytics/analytics.router';
import { favoritesRouter } from './modules/favorites/favorites.router';
import { mediaRouter } from './modules/media/media.router';
import { promosRouter } from './modules/promos/promos.router';
import { referralsRouter } from './modules/referrals/referrals.router';
import { supportRouter } from './modules/support/support.router';
import { webhooksRouter } from './modules/webhooks/webhooks.router';
import { currenciesRouter } from './modules/currencies/currencies.router';
import { clientRatingsRouter } from './modules/client-ratings/client-ratings.router';
import { collaboratorsRouter } from './modules/collaborators/collaborators.router';
import { websiteRouter } from './modules/website/website.router';
import { foodOrdersRouter } from './modules/restaurant/food-orders.router';
import { featureFlagsRouter } from './modules/feature-flags/feature-flags.router';

export function createApp(): Application {
  const app = express();

  // Request ID first so all subsequent middleware/logs can reference it
  applyRequestId(app);

  // Security & transport middlewares
  applyHelmet(app);
  applyCors(app);
  applyCompression(app);
  applyLogger(app);

  // Raw body must be parsed before JSON for webhook signature verification
  applyRawBody(app);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Global rate limiting (tighter limits applied per-route for auth endpoints)
  applyRateLimit(app);

  // Health check (no auth required)
  app.get('/', (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Primeo API is running', environment: env.NODE_ENV });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
  });

  // Documentation OpenAPI interactive (Swagger UI) — sans authentification
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Primeo API — Docs' }));
  // Spécification brute (utile pour la génération de clients)
  app.get('/api-docs.json', (_req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // API routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/availabilities', availabilitiesRouter);
  app.use('/api/reviews', reviewsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/professional', professionalRouter);
  app.use('/api/admin/auth', adminAuthRouter); // public admin auth — must precede protected admin router
  app.use('/api/admin', adminRouter);
  app.use('/api/boosts', boostsRouter);
  app.use('/api/disputes', disputesRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/favorites', favoritesRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/promos', promosRouter);
  app.use('/api/referrals', referralsRouter);
  app.use('/api/support', supportRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/currencies', currenciesRouter);
  app.use('/api/client-ratings', clientRatingsRouter);
  app.use('/api/collaborators', collaboratorsRouter);
  app.use('/api/website', websiteRouter);
  app.use('/api/food-orders', foodOrdersRouter);
  app.use('/api/feature-flags', featureFlagsRouter);

  // Sentry error handler — must come AFTER all routes and BEFORE custom error handlers
  if (env.SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
  }

  // Custom error handlers (must be last)
  app.use(handlePrismaError);
  app.use(handleHttpError);

  return app;
}
