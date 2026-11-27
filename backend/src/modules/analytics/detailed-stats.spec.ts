// Statistiques détaillées du professionnel : agrégation des vues, clics, tentatives,
// réservations confirmées, revenus et conversion, au total, par jour et par annonce.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../payments/services/genius-pay.service', () => ({ geniusPayService: {} }));
jest.mock('../../common/utils/market-report', () => ({ generateMarketReportPdf: jest.fn() }));
jest.mock('../../common/utils/mailer', () => ({ sendEmail: jest.fn() }));
jest.mock('../../config/env.config', () => ({ env: {} }));

const mockPrisma: Record<string, any> = {
  subscription: { findUnique: jest.fn() },
  property: { findMany: jest.fn() },
  propertyEvent: { groupBy: jest.fn() },
  $queryRaw: jest.fn(),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { analyticsService } from './analytics.service';

const today = new Date();
today.setUTCHours(10, 0, 0, 0);
const day = today.toISOString().slice(0, 10);

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', status: 'active' });
  mockPrisma.property.findMany.mockResolvedValue([
    { id: 'p1', title: 'Villa', propertyType: 'villa', viewsCount: 40, bookingsCount: 2, rating: 4.5, reviewCount: 1,
      isBoosted: true, boostExpiresAt: new Date(Date.now() + 3600_000), pricePerNight: 30000, pricePerMonth: null, priceSale: null,
      bookings: [{ id: 'b1', totalAmount: 60000, commissionAmount: 3000, createdAt: today }] },
    { id: 'p2', title: 'Studio', propertyType: 'studio', viewsCount: 5, bookingsCount: 0, rating: null, reviewCount: 0,
      isBoosted: false, boostExpiresAt: null, pricePerNight: 15000, pricePerMonth: null, priceSale: null, bookings: [] },
  ]);
  mockPrisma.propertyEvent.groupBy.mockResolvedValue([
    { propertyId: 'p1', type: 'view', _count: { _all: 8 } },
    { propertyId: 'p1', type: 'click', _count: { _all: 5 } },
    { propertyId: 'p1', type: 'booking_attempt', _count: { _all: 2 } },
    { propertyId: 'p2', type: 'view', _count: { _all: 2 } },
  ]);
  mockPrisma.$queryRaw.mockResolvedValue([
    { day: today, type: 'view', count: BigInt(10) },
    { day: today, type: 'click', count: BigInt(5) },
    { day: today, type: 'booking_attempt', count: BigInt(2) },
  ]);
});

describe('analyticsService.getDetailedStats', () => {
  it('totaux, conversion et revenus à partir des événements réels', async () => {
    const s = await analyticsService.getDetailedStats('pro-1', { period: '7d' });
    expect(s).toMatchObject({
      period: '7d', views: 10, clicks: 5, bookingAttempts: 2, bookings: 1,
      conversionRate: 10, revenue: 60000, netRevenue: 57000,
    });
    expect(s.daily).toHaveLength(7);
    expect(s.daily.find((d) => d.date === day)).toMatchObject({ views: 10, clicks: 5, bookingAttempts: 2, bookings: 1, revenue: 60000 });
  });

  it('détail par annonce', async () => {
    const s = await analyticsService.getDetailedStats('pro-1', { period: '30d' });
    expect(s.properties[0]).toMatchObject({ id: 'p1', name: 'Villa', views: 8, clicks: 5, bookingAttempts: 2, bookings: 1, revenue: 60000, conversion: 12.5 });
    expect(s.properties[1]).toMatchObject({ id: 'p2', views: 2, clicks: 0, bookings: 0, conversion: 0 });
  });

  it('conversion plafonnée à 100 % (réservations issues de visites non suivies)', async () => {
    mockPrisma.propertyEvent.groupBy.mockResolvedValue([{ propertyId: 'p1', type: 'view', _count: { _all: 0 } }]);
    mockPrisma.$queryRaw.mockResolvedValue([]);
    const s = await analyticsService.getDetailedStats('pro-1', { period: '7d' });
    expect(s.conversionRate).toBe(0); // aucune vue → 0 et non l'infini
    mockPrisma.propertyEvent.groupBy.mockResolvedValue([{ propertyId: 'p2', type: 'view', _count: { _all: 1 } }]);
    mockPrisma.property.findMany.mockResolvedValue([{ ...(await mockPrisma.property.findMany.getMockImplementation?.()), id: 'p2', title: 'S', propertyType: 'studio', viewsCount: 1, bookingsCount: 0, rating: null, reviewCount: 0, isBoosted: false, boostExpiresAt: null, pricePerNight: 1, pricePerMonth: null, priceSale: null,
      bookings: [{ id: 'x', totalAmount: 1, commissionAmount: 0, createdAt: new Date() }, { id: 'y', totalAmount: 1, commissionAmount: 0, createdAt: new Date() }] }]);
    const s2 = await analyticsService.getDetailedStats('pro-1', { period: '7d' });
    expect(s2.conversionRate).toBe(100);
    expect(s2.properties[0].conversion).toBe(100);
  });

  it('période « 1 an » = 365 jours', async () => {
    const s = await analyticsService.getDetailedStats('pro-1', { period: '1y' });
    expect(s.daily).toHaveLength(365);
  });

  it('formule Starter → 403', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter', status: 'active' });
    await expect(analyticsService.getDetailedStats('pro-1', {})).rejects.toMatchObject({ statusCode: 403 });
  });
});
