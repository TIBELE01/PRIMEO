// Tests — daily-report.job : collecte des stats de la veille, destinataires, envoi.

jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockEnv: { ADMIN_EMAILS?: string; ADMIN_EMAIL?: string } = {};
jest.mock('../config/env.config', () => ({ env: mockEnv }));

const mockSendEmail = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock('../common/utils/mailer', () => ({ sendEmail: (...a: unknown[]) => mockSendEmail(...a) }));

jest.mock('../common/middleware/error-alert.middleware', () => ({
  getErrorMetrics: () => ({ recentPerMinute: 0, hourly: [], currentHour: 0, totalLast24h: 3 }),
}));

const mockPrisma = {
  user: { count: jest.fn() },
  booking: { count: jest.fn() },
  transaction: { aggregate: jest.fn() },
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

import { collectDailyStats, getAdminRecipients, buildDailyReportHtml, sendDailyReport } from './daily-report.job';

describe('daily-report.job', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete mockEnv.ADMIN_EMAILS;
    delete mockEnv.ADMIN_EMAIL;
  });

  describe('collectDailyStats', () => {
    beforeEach(() => {
      // 6 appels user.count? Non : 2 user.count (clients, pros), 3 booking.count, 1 aggregate
      mockPrisma.user.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      mockPrisma.booking.count
        .mockResolvedValueOnce(8)   // newBookings
        .mockResolvedValueOnce(6)   // confirmedBookings
        .mockResolvedValueOnce(1);  // cancelledBookings
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 150000 } });
    });

    it('agrège les chiffres de la veille (clients, pros, réservations, CA)', async () => {
      const s = await collectDailyStats(new Date('2026-06-15T07:00:00Z'));
      expect(s.newClients).toBe(5);
      expect(s.newPros).toBe(2);
      expect(s.newBookings).toBe(8);
      expect(s.confirmedBookings).toBe(6);
      expect(s.cancelledBookings).toBe(1);
      expect(s.revenue).toBe(150000);
      expect(s.commission).toBe(0); // commission 0 %
      expect(s.criticalErrors).toBe(3);
    });

    it('cible bien la veille (00:00 → 23:59 de J-1)', async () => {
      await collectDailyStats(new Date('2026-06-15T07:00:00Z'));
      const firstCall = mockPrisma.user.count.mock.calls[0]![0];
      const range = firstCall.where.createdAt;
      // début = veille à 00:00, fin = veille à 23:59
      expect(range.gte.getDate()).toBe(14);
      expect(range.lte.getDate()).toBe(14);
      expect(range.gte.getHours()).toBe(0);
    });

    it('revenue à 0 si aucun paiement', async () => {
      jest.clearAllMocks();
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: null } });
      const s = await collectDailyStats();
      expect(s.revenue).toBe(0);
    });
  });

  describe('getAdminRecipients', () => {
    it('parse ADMIN_EMAILS séparés par des virgules', () => {
      mockEnv.ADMIN_EMAILS = 'a@primeo.ci, b@primeo.ci ,c@primeo.ci';
      expect(getAdminRecipients()).toEqual(['a@primeo.ci', 'b@primeo.ci', 'c@primeo.ci']);
    });
    it('retombe sur ADMIN_EMAIL si ADMIN_EMAILS absent', () => {
      mockEnv.ADMIN_EMAIL = 'solo@primeo.ci';
      expect(getAdminRecipients()).toEqual(['solo@primeo.ci']);
    });
    it('retourne [] si aucun configuré', () => {
      expect(getAdminRecipients()).toEqual([]);
    });
  });

  describe('buildDailyReportHtml', () => {
    it('inclut les chiffres clés et la mention 0 %', () => {
      const html = buildDailyReportHtml({
        periodLabel: 'samedi 14 juin 2026',
        newClients: 5, newPros: 2, newBookings: 8, confirmedBookings: 6,
        cancelledBookings: 1, revenue: 150000, commission: 0, criticalErrors: 3,
      });
      // Normaliser les espaces (fr-CI groupe avec une espace insécable étroite)
      const normalized = html.replace(/\s/g, ' ');
      expect(normalized).toContain('150 000 FCFA');
      expect(normalized).toContain('0 %');
      expect(html).toContain('samedi 14 juin 2026');
      expect(html).toContain('PRIMEO');
    });
  });

  describe('sendDailyReport', () => {
    beforeEach(() => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    });
    it('n\'envoie pas et retourne false sans destinataire', async () => {
      const ok = await sendDailyReport();
      expect(ok).toBe(false);
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
    it('envoie l\'email aux destinataires configurés', async () => {
      mockEnv.ADMIN_EMAILS = 'a@primeo.ci,b@primeo.ci';
      const ok = await sendDailyReport();
      expect(ok).toBe(true);
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [
            { email: 'a@primeo.ci', name: 'Équipe Primeo' },
            { email: 'b@primeo.ci', name: 'Équipe Primeo' },
          ],
        }),
      );
    });
  });
});
