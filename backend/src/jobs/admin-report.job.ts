// Admin weekly report cron — every Sunday at 3:00 AM
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { sendEmail } from '../common/utils/mailer';
import { env } from '../config/env.config';

async function buildWeeklyReport(): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    newUsers,
    newBookings,
    completedBookings,
    cancelledBookings,
    newProperties,
    openDisputes,
    weeklyRevenue,
    activeSubscriptions,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.booking.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.booking.count({ where: { status: 'completed', updatedAt: { gte: weekAgo } } }),
    prisma.booking.count({
      where: {
        status: { in: ['cancelled_by_client', 'cancelled_by_professional'] },
        updatedAt: { gte: weekAgo },
      },
    }),
    prisma.property.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.dispute.count({ where: { status: 'open' } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { status: 'success', type: 'client_payment', completedAt: { gte: weekAgo } },
    }),
    prisma.subscription.count({ where: { status: 'active', planType: { not: 'starter' } } }),
  ]);

  const revenue = weeklyRevenue._sum.amount ?? 0;
  const periodLabel = `${weekAgo.toLocaleDateString('fr-CI')} → ${now.toLocaleDateString('fr-CI')}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Rapport Primeo</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr><td style="background:#1E3A5F;padding:28px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700;">PRIMEO</h1>
          <p style="color:#B0C4DE;margin:4px 0 0;font-size:12px;">Rapport d'activité hebdomadaire</p>
          <p style="color:#F97316;margin:8px 0 0;font-size:12px;">${periodLabel}</p>
        </td></tr>
        <tr><td style="padding:32px 40px;">
          <h2 style="color:#1E3A5F;font-size:16px;margin:0 0 20px;">Résumé de la semaine</h2>
          <table width="100%" cellpadding="0" cellspacing="8">
            ${stat('Nouveaux utilisateurs', newUsers)}
            ${stat('Nouvelles réservations', newBookings)}
            ${stat('Réservations terminées', completedBookings)}
            ${stat('Réservations annulées', cancelledBookings)}
            ${stat('Nouvelles propriétés', newProperties)}
            ${stat('Litiges ouverts', openDisputes)}
            ${stat('Abonnements payants actifs', activeSubscriptions)}
            ${stat('CA encaissé (paiements en ligne)', revenue.toLocaleString('fr-CI') + ' FCFA', true)}
          </table>
        </td></tr>
        <tr><td style="background:#f9f9f9;padding:20px 40px;text-align:center;border-top:1px solid #eee;">
          <p style="font-size:11px;color:#aaa;margin:0;">
            © ${now.getFullYear()} Primeo CI — Rapport généré automatiquement le ${now.toLocaleString('fr-CI')}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function stat(label: string, value: number | string, highlight = false): string {
  return `<tr>
    <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#555;">${label}</td>
    <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;font-weight:bold;color:${highlight ? '#F97316' : '#1E3A5F'};text-align:right;">${value}</td>
  </tr>`;
}

export function startAdminReportJob(): void {
  // Every Sunday at 03:00
  cron.schedule('0 3 * * 0', async () => {
    logger.info('Weekly admin report job started');

    const adminEmail = env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.warn('Admin report: ADMIN_EMAIL not configured, skipping');
      return;
    }

    try {
      const html = await buildWeeklyReport();
      await sendEmail({
        to: [{ email: adminEmail, name: 'Équipe Primeo' }],
        subject: `Rapport hebdomadaire Primeo — ${new Date().toLocaleDateString('fr-CI')}`,
        htmlContent: html,
      });
      logger.info(`Weekly admin report sent to ${adminEmail}`);
    } catch (err) {
      logger.error('Weekly admin report job failed', err);
    }
  });

  logger.info('Admin report job scheduled (every Sunday at 03:00)');
}
