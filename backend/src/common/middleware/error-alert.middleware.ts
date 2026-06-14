import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import * as Sentry from '@sentry/node';
import { env } from '../../config/env.config';
import { logger } from '../utils/logger';

const RATE_WINDOW_MS = 60_000;        // 1-minute sliding window
const RATE_THRESHOLD = 10;            // errors/min before triggering Slack alert
const ALERT_COOLDOWN_MS = 5 * 60_000; // min interval between alerts
const HOURLY_BUCKETS = 24;

const errorTimestamps: number[] = [];
let lastAlertTime = 0;
const hourlyErrors: number[] = new Array(HOURLY_BUCKETS).fill(0);
let lastBucketHour = new Date().getHours();

export interface ErrorMetrics {
  recentPerMinute: number;
  hourly: number[];
  currentHour: number;
  totalLast24h: number;
}

export function getErrorMetrics(): ErrorMetrics {
  const now = Date.now();
  const recentPerMinute = errorTimestamps.filter((t) => now - t < RATE_WINDOW_MS).length;
  return {
    recentPerMinute,
    hourly: [...hourlyErrors],
    currentHour: lastBucketHour,
    totalLast24h: hourlyErrors.reduce((a, b) => a + b, 0),
  };
}

async function sendSlackAlert(text: string): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;
  const now = Date.now();
  if (now - lastAlertTime < ALERT_COOLDOWN_MS) return;
  lastAlertTime = now;
  try {
    await axios.post(
      env.SLACK_WEBHOOK_URL,
      { text, username: 'Primeo Monitor', icon_emoji: ':rotating_light:' },
      { timeout: 5_000 },
    );
  } catch (err) {
    logger.error('[alert] Slack webhook failed', err instanceof Error ? err.message : err);
  }
}

// Must be registered AFTER Sentry error handler, BEFORE custom error formatters.
// Has 4 params so Express recognises it as an error-handling middleware.
export function errorAlertMiddleware(
  err: Error,
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const now = Date.now();

  // Rotate hourly bucket on hour boundary
  const thisHour = new Date(now).getHours();
  if (thisHour !== lastBucketHour) {
    lastBucketHour = thisHour;
    hourlyErrors[thisHour] = 0;
  }
  hourlyErrors[thisHour]!++;

  // Sliding-window rate detection
  errorTimestamps.push(now);
  const cutoff = now - RATE_WINDOW_MS;
  while (errorTimestamps.length > 0 && errorTimestamps[0]! < cutoff) errorTimestamps.shift();

  if (errorTimestamps.length >= RATE_THRESHOLD) {
    const alertText =
      `🚨 *Primeo API — Taux d'erreur élevé*\n` +
      `*${errorTimestamps.length} erreurs* en 1 minute\n` +
      `Dernière : \`${err.message}\` · \`${req.method} ${req.path}\`\n` +
      `Env : ${env.NODE_ENV} · ${new Date().toISOString()}`;

    sendSlackAlert(alertText).catch(() => null);

    // Forward high-error-rate event to Sentry as a warning
    if (env.SENTRY_DSN) {
      Sentry.captureMessage(
        `High error rate: ${errorTimestamps.length} errors/min on ${req.method} ${req.path}`,
        {
          level: 'warning',
          tags: { alert_type: 'high_error_rate', endpoint: req.path },
          extra: { errorsPerMinute: errorTimestamps.length, lastError: err.message },
        },
      );
    }
  }

  // Capture webhook failures as Sentry errors with a dedicated tag
  if (req.path.includes('/webhooks/') && env.SENTRY_DSN) {
    Sentry.captureException(err, {
      tags: { alert_type: 'webhook_failure', webhook_path: req.path },
      extra: { method: req.method, body: req.body },
    });
  }

  next(err);
}
