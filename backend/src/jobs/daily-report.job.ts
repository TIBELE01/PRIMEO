// Daily admin report cron — chaque matin à 07:00 : résumé d'activité de la veille.
// Distinct du rapport hebdomadaire (admin-report.job, dimanche) et du digest de
// santé (monitoring-report.job, 08:00). Ici : chiffres business de la journée J-1.
import type { AccountType } from '@prisma/client';
import cron from 'node-cron';
import { prisma } from '../database/prisma.service';
import { logger } from '../common/utils/logger';
import { sendEmail } from '../common/utils/mailer';
import { env } from '../config/env.config';
import { getErrorMetrics } from '../common/middleware/error-alert.middleware';

// Rôles considérés comme "professionnels" pour distinguer des clients.
const PRO_ACCOUNT_TYPES: AccountType[] = [
  'professional_hebergement',
  'professional_hotel',
  'professional_immobilier',
  'restaurateur',
];

export interface DailyReportStats {
  periodLabel: string;
  newClients: number;
  newPros: number;
  newBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  revenue: number;
  commission: number;
  criticalErrors: number;
}

/** Collecte les statistiques de la veille (00:00 → 23:59 du jour précédent). */
export async function collectDailyStats(now = new Date()): Promise<DailyReportStats> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1); // début de la veille
  const end = new Date(start);
  end.setHours(23, 59, 59, 999); // fin de la veille

  const range = { gte: start, lte: end };

  const [newClients, newPros, newBookings, confirmedBookings, cancelledBookings, revenueAgg] =
    await Promise.all([
      prisma.user.count({ where: { createdAt: range, accountType: 'client' } }),
      prisma.user.count({ where: { createdAt: range, accountType: { in: PRO_ACCOUNT_TYPES } } }),
      prisma.booking.count({ where: { createdAt: range } }),
      prisma.booking.count({ where: { status: 'confirmed', confirmedAt: range } }),
      prisma.booking.count({
        where: {
          status: { in: ['cancelled_by_client', 'cancelled_by_professional'] },
          cancelledAt: range,
        },
      }),
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: 'success', type: 'client_payment', completedAt: range },
      }),
    ]);

  return {
    periodLabel: start.toLocaleDateString('fr-CI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    newClients,
    newPros,
    newBookings,
    confirmedBookings,
    cancelledBookings,
    revenue: revenueAgg._sum.amount ?? 0,
    commission: 0, // Commission 0 % sur toutes les formules
    criticalErrors: getErrorMetrics().totalLast24h,
  };
}

function statRow(label: string, value: number | string, highlight = false): string {
  return `<tr>
    <td style="padding:10px 14px;border-bottom:1px solid #EEF1F6;font-size:14px;color:#475569;">${label}</td>
    <td style="padding:10px 14px;border-bottom:1px solid #EEF1F6;font-size:15px;font-weight:700;color:${highlight ? '#D67309' : '#0F1729'};text-align:right;">${value}</td>
  </tr>`;
}

export function buildDailyReportHtml(s: DailyReportStats): string {
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8"><title>Rapport quotidien Primeo</title></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FB;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.07);">
        <tr><td style="background:#1056E0;padding:26px 40px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:1px;">PRIMEO</h1>
          <p style="color:#C9DAFB;margin:6px 0 0;font-size:13px;">Rapport d'activité quotidien</p>
          <p style="color:#FCD9B0;margin:6px 0 0;font-size:13px;text-transform:capitalize;">${s.periodLabel}</p>
        </td></tr>
        <tr><td style="padding:30px 40px;">
          <h2 style="color:#0F1729;font-size:16px;margin:0 0 18px;">Activité de la veille</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${statRow('Nouvelles inscriptions clients', s.newClients)}
            ${statRow('Nouvelles inscriptions pros', s.newPros)}
            ${statRow('Nouvelles réservations', s.newBookings)}
            ${statRow('Réservations confirmées', s.confirmedBookings)}
            ${statRow('Réservations annulées', s.cancelledBookings)}
            ${statRow('Chiffre d\'affaires encaissé', s.revenue.toLocaleString('fr-CI') + ' FCFA', true)}
            ${statRow('Commission plateforme', s.commission.toLocaleString('fr-CI') + ' FCFA (0 %)')}
            ${statRow('Erreurs critiques (24h)', s.criticalErrors)}
          </table>
        </td></tr>
        <tr><td style="background:#F9FAFB;padding:18px 40px;text-align:center;border-top:1px solid #EEF1F6;">
          <p style="font-size:11px;color:#9AA6B8;margin:0;">© ${new Date().getFullYear()} Primeo CI — Rapport généré automatiquement.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Liste des destinataires : ADMIN_EMAILS (CSV) sinon ADMIN_EMAIL. */
export function getAdminRecipients(): string[] {
  if (env.ADMIN_EMAILS) {
    return env.ADMIN_EMAILS.split(',').map(e => e.trim()).filter(Boolean);
  }
  return env.ADMIN_EMAIL ? [env.ADMIN_EMAIL] : [];
}

/** Génère et envoie le rapport quotidien. Exporté pour test/déclenchement manuel. */
export async function sendDailyReport(): Promise<boolean> {
  const recipients = getAdminRecipients();
  if (recipients.length === 0) {
    logger.warn('Daily report: aucun destinataire (ADMIN_EMAILS / ADMIN_EMAIL absents), ignoré');
    return false;
  }
  const stats = await collectDailyStats();
  const html = buildDailyReportHtml(stats);
  await sendEmail({
    to: recipients.map(email => ({ email, name: 'Équipe Primeo' })),
    subject: `Rapport quotidien Primeo — ${stats.periodLabel}`,
    htmlContent: html,
  });
  logger.info(`Daily report envoyé à ${recipients.length} destinataire(s)`);
  return true;
}

export function startDailyReportJob(): void {
  // Chaque jour à 07:00
  cron.schedule('0 7 * * *', async () => {
    logger.info('Daily admin report job started');
    try {
      await sendDailyReport();
    } catch (err) {
      logger.error('Daily admin report job failed', err);
    }
  });

  logger.info('Daily report job scheduled (every day at 07:00)');
}
