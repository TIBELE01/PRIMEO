jest.mock('../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../config/env.config', () => ({ env: {} }));
jest.mock('../database/prisma.service', () => ({ prisma: {} }));
jest.mock('../common/utils/mailer', () => ({ sendEmail: jest.fn() }));

import { previousMonth, renderMonthlyReportPdf } from './monthly-report.job';

describe('rapport mensuel Entreprise', () => {
  it('fenêtre = mois civil précédent', () => {
    const { start, end, label } = previousMonth(new Date('2026-12-01T07:00:00Z'));
    expect(start.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T00:00:00.000Z');
    expect(label).toBe('novembre 2026');
  });
  it('janvier → décembre de l’année précédente', () => {
    expect(previousMonth(new Date('2027-01-01T07:00:00Z')).label).toBe('décembre 2026');
  });
  it('génère un PDF', async () => {
    const pdf = await renderMonthlyReportPdf({
      ownerName: 'Awa Koné', periodLabel: 'novembre 2026',
      totals: { views: 120, clicks: 30, attempts: 8, bookings: 3, revenue: 105000, reviews: 2, rating: 4.5 },
      properties: [{ title: 'Studio Marcory', views: 80, bookings: 2, revenue: 70000 }],
    });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
