// Daily monitoring digest — sent every morning at 08:00 to ADMIN_EMAIL
import cron from 'node-cron';
import { logger } from '../common/utils/logger';
import { sendEmail } from '../common/utils/mailer';
import { env } from '../config/env.config';
import {
  checkDatabase,
  checkRedis,
  checkGeniusPay,
  checkBrevo,
  overallStatus,
  CheckResult,
} from '../modules/health/health.router';
import { getErrorMetrics } from '../common/middleware/error-alert.middleware';

export function startMonitoringReportJob(): void {
  cron.schedule('0 8 * * *', async () => {
    logger.info('Daily monitoring report job started');
    if (!env.ADMIN_EMAIL) {
      logger.warn('Monitoring report: ADMIN_EMAIL not configured, skipping');
      return;
    }
    try {
      const html = await buildMonitoringReport();
      await sendEmail({
        to: [{ email: env.ADMIN_EMAIL, name: 'Équipe Primeo' }],
        subject: `[Primeo] Monitoring — ${new Date().toLocaleDateString('fr-CI')}`,
        htmlContent: html,
      });
      logger.info(`Daily monitoring report sent to ${env.ADMIN_EMAIL}`);
    } catch (err) {
      logger.error('Daily monitoring report failed', err);
    }
  });
  logger.info('Monitoring report job scheduled (daily at 08:00)');
}

async function buildMonitoringReport(): Promise<string> {
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
  const metrics = getErrorMetrics();
  const mem = process.memoryUsage();

  const statusColor = status === 'ok' ? '#16a34a' : status === 'degraded' ? '#f59e0b' : '#dc2626';
  const statusLabel =
    status === 'ok' ? '✅ Opérationnel' : status === 'degraded' ? '⚠️ Dégradé' : '🔴 En panne';

  const serviceRows = Object.entries(checks)
    .map(([name, c]) => {
      const color = c.status === 'ok' ? '#16a34a' : c.status === 'degraded' ? '#f59e0b' : '#dc2626';
      const icon = c.status === 'ok' ? '✅' : c.status === 'degraded' ? '⚠️' : '🔴';
      const latency = c.latencyMs != null ? `${c.latencyMs}ms` : '—';
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;">${name.replace('_', ' ')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:bold;color:${color};">${icon} ${c.status}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;">${latency}</td>
      </tr>`;
    })
    .join('');

  const uptimeSec = process.uptime();
  const d = Math.floor(uptimeSec / 86_400);
  const h = Math.floor((uptimeSec % 86_400) / 3_600);

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Monitoring Primeo</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

<tr><td style="background:#1056E0;padding:28px 40px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">PRIMEO</h1>
  <p style="color:#B0C4DE;margin:4px 0 0;font-size:12px;">Rapport de monitoring quotidien</p>
  <p style="color:#5bbd15;margin:8px 0 0;font-size:13px;font-weight:bold;">${new Date().toLocaleDateString('fr-CI', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
</td></tr>

<tr><td style="padding:24px 40px 8px;">
  <div style="background:${statusColor}20;border:1.5px solid ${statusColor};border-radius:8px;padding:12px 16px;text-align:center;">
    <span style="font-size:16px;font-weight:bold;color:${statusColor};">${statusLabel}</span>
  </div>
</td></tr>

<tr><td style="padding:16px 40px;">
  <h2 style="color:#1056E0;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px;">Services</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f9f9f9;">
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Service</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Statut</th>
      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#888;font-weight:600;">Latence</th>
    </tr>
    ${serviceRows}
  </table>
</td></tr>

<tr><td style="padding:8px 40px 16px;">
  <h2 style="color:#1056E0;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:.5px;">Métriques (dernières 24 h)</h2>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;">Total erreurs 24 h</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:bold;color:#dc2626;text-align:right;">${metrics.totalLast24h}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;">Erreurs dernière minute</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:bold;color:#1056E0;text-align:right;">${metrics.recentPerMinute}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;">Mémoire heap utilisée</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:bold;color:#1056E0;text-align:right;">${Math.round(mem.heapUsed / 1_048_576)} Mo</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-size:14px;color:#555;">Uptime</td>
      <td style="padding:8px 12px;font-size:14px;font-weight:bold;color:#1056E0;text-align:right;">${d}j ${h}h</td>
    </tr>
  </table>
</td></tr>

<tr><td style="background:#f9f9f9;padding:16px 40px;text-align:center;border-top:1px solid #eee;">
  <p style="font-size:11px;color:#aaa;margin:0;">
    © ${new Date().getFullYear()} Primeo CI · Généré automatiquement le ${new Date().toLocaleString('fr-CI')}
  </p>
</td></tr>

</table></td></tr></table>
</body>
</html>`;
}
