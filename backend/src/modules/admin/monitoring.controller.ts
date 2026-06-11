import { Request, Response } from 'express';
import {
  checkDatabase,
  checkRedis,
  checkGeniusPay,
  checkBrevo,
  overallStatus,
  CheckResult,
} from '../health/health.router';
import { getErrorMetrics } from '../../common/middleware/error-alert.middleware';

export async function getMonitoringDashboard(_req: Request, res: Response): Promise<void> {
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

  const mem = process.memoryUsage();

  res.json({
    status: overallStatus(checks),
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    uptimeHuman: formatUptime(process.uptime()),
    node: process.version,
    memory: {
      heapUsedMb: Math.round(mem.heapUsed / 1_048_576),
      heapTotalMb: Math.round(mem.heapTotal / 1_048_576),
      rssMb: Math.round(mem.rss / 1_048_576),
    },
    services: checks, // includes detail/error fields for admin visibility
    errors: getErrorMetrics(),
  });
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}j`);
  if (h) parts.push(`${h}h`);
  parts.push(`${m}min`);
  return parts.join(' ');
}
