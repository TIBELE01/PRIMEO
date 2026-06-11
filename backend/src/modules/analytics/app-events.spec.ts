// Tests de l'ingestion d'événements analytics anonymisés (liste blanche, plafond).
const createMany = jest.fn();

jest.mock('../../database/prisma.service', () => ({
  prisma: { appEvent: { createMany: (...args: unknown[]) => createMany(...args) } },
}));
jest.mock('../../common/utils/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: {} }));
jest.mock('../../common/utils/market-report', () => ({ generateMarketReportPdf: jest.fn() }));
jest.mock('../../common/utils/mailer', () => ({ sendEmail: jest.fn() }));
jest.mock('../../config/env.config', () => ({ env: {} }));

import { analyticsService } from './analytics.service';

beforeEach(() => {
  jest.clearAllMocks();
  createMany.mockResolvedValue({ count: 1 });
});

describe('analyticsService.recordEvents', () => {
  it('enregistre un événement de la liste blanche', async () => {
    const result = await analyticsService.recordEvents([
      { name: 'property_view', platform: 'mobile', sessionId: 'abc', metadata: { propertyId: 'p1' } },
    ]);
    expect(result.recorded).toBe(1);
    expect(createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ name: 'property_view', platform: 'mobile' })],
    });
  });

  it('rejette silencieusement les événements hors liste blanche', async () => {
    const result = await analyticsService.recordEvents([
      { name: 'drop_table_users' },
      { name: 'login' },
    ]);
    expect(result.recorded).toBe(1);
    const data = createMany.mock.calls[0][0].data;
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('login');
  });

  it('ne fait aucun appel DB quand tout le lot est invalide', async () => {
    const result = await analyticsService.recordEvents([{ name: 'inconnu' }]);
    expect(result.recorded).toBe(0);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('plafonne le lot à 20 événements', async () => {
    const events = Array.from({ length: 30 }, () => ({ name: 'page_view' }));
    const result = await analyticsService.recordEvents(events);
    expect(result.recorded).toBe(20);
    expect(createMany.mock.calls[0][0].data).toHaveLength(20);
  });

  it('tronque les champs trop longs (anti-abus)', async () => {
    await analyticsService.recordEvents([
      { name: 'login', sessionId: 'x'.repeat(200), role: 'r'.repeat(200) },
    ]);
    const row = createMany.mock.calls[0][0].data[0];
    expect(row.sessionId).toHaveLength(64);
    expect(row.role).toHaveLength(40);
  });
});
