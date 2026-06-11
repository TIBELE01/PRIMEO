import { Router, Request, Response } from 'express';
import { prisma } from '../../database/prisma.service';
import { getRedisClient } from '../../common/utils/redis-client';
import { env } from '../../config/env.config';
import axios from 'axios';

export const healthRouter = Router();

export type ServiceStatus = 'ok' | 'degraded' | 'down';

export interface CheckResult {
  status: ServiceStatus;
  latencyMs?: number;
  detail?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export async function checkDatabase(): Promise<CheckResult> {
  const t = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 3_000);
    return { status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkRedis(): Promise<CheckResult> {
  const client = getRedisClient();
  if (!client) return { status: 'degraded', detail: 'not configured' };
  const t = Date.now();
  try {
    await withTimeout(client.ping(), 3_000);
    return { status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkGeniusPay(): Promise<CheckResult> {
  if (!env.GENIUS_PAY_API_URL) return { status: 'degraded', detail: 'not configured' };
  const t = Date.now();
  try {
    await withTimeout(
      axios.head(env.GENIUS_PAY_API_URL, { timeout: 4_000, validateStatus: () => true }),
      5_000,
    );
    return { status: 'ok', latencyMs: Date.now() - t };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function checkBrevo(): Promise<CheckResult> {
  if (!env.BREVO_API_KEY) return { status: 'degraded', detail: 'not configured' };
  const t = Date.now();
  try {
    const resp = await withTimeout(
      axios.get('https://api.brevo.com/v3/account', {
        headers: { 'api-key': env.BREVO_API_KEY },
        timeout: 4_000,
        validateStatus: () => true,
      }),
      5_000,
    );
    return { status: resp.status < 500 ? 'ok' : 'down', latencyMs: Date.now() - t };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

export function overallStatus(checks: Record<string, CheckResult>): ServiceStatus {
  const statuses = Object.values(checks).map((c) => c.status);
  if (statuses.every((s) => s === 'ok')) return 'ok';
  if (statuses.some((s) => s === 'down')) return 'down';
  return 'degraded';
}

// GET /api/health — fast liveness probe (no external checks, used by load balancers)
healthRouter.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// GET /api/health/ready — full readiness probe (checks DB, Redis, Genius Pay, Brevo)
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const [db, redis, geniusPay, brevo] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkGeniusPay(),
    checkBrevo(),
  ]);

  const checks: Record<string, CheckResult> = {
    database: db,
    redis,
    genius_pay: geniusPay,
    brevo,
  };
  const status = overallStatus(checks);

  // Strip sensitive error details from the public response
  const services = Object.fromEntries(
    Object.entries(checks).map(([k, v]) => [k, { status: v.status, latencyMs: v.latencyMs }]),
  );

  res.status(status === 'down' ? 503 : 200).json({
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services,
  });
});
