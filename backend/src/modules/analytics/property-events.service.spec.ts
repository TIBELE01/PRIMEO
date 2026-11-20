// Événements de performance des annonces : propriétaire exclu, anti-doublon par
// minute, aucune donnée personnelle stockée, vue = incrément du compteur cumulé.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  propertyEvent: { findFirst: jest.fn(), create: jest.fn(async () => ({ id: 'e1' })) },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { propertyEventsService } from './property-events.service';

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.property.findUnique.mockResolvedValue({ ownerId: 'pro-1' });
  mockPrisma.propertyEvent.findFirst.mockResolvedValue(null);
});

describe('propertyEventsService.record', () => {
  it('vue d\'un client : événement enregistré + compteur cumulé incrémenté', async () => {
    const r = await propertyEventsService.record({ propertyId: 'p1', type: 'view', userId: 'client-1' });
    expect(r.recorded).toBe(true);
    const data = mockPrisma.propertyEvent.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ propertyId: 'p1', type: 'view' });
    expect(data.visitorKey).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(data)).not.toContain('client-1'); // jamais l'identifiant en clair
    expect(mockPrisma.property.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { viewsCount: { increment: 1 } } });
  });

  it('le propriétaire qui consulte sa propre annonce n\'est pas compté', async () => {
    const r = await propertyEventsService.record({ propertyId: 'p1', type: 'view', userId: 'pro-1' });
    expect(r.recorded).toBe(false);
    expect(mockPrisma.propertyEvent.create).not.toHaveBeenCalled();
  });

  it('anti-doublon : même visiteur, même annonce, moins d\'une minute → ignoré', async () => {
    mockPrisma.propertyEvent.findFirst.mockResolvedValue({ id: 'e0' });
    const r = await propertyEventsService.record({ propertyId: 'p1', type: 'click', userId: 'client-1', source: 'search' });
    expect(r.recorded).toBe(false);
  });

  it('visiteur anonyme : compté, sans empreinte', async () => {
    await propertyEventsService.record({ propertyId: 'p1', type: 'click', source: 'home' });
    expect(mockPrisma.propertyEvent.create.mock.calls[0][0].data).toMatchObject({ type: 'click', visitorKey: null, source: 'home' });
    expect(mockPrisma.property.update).not.toHaveBeenCalled();
  });

  it('tentative de réservation : toujours comptée (pas d\'anti-doublon)', async () => {
    mockPrisma.propertyEvent.findFirst.mockResolvedValue({ id: 'e0' });
    const r = await propertyEventsService.record({ propertyId: 'p1', type: 'booking_attempt', userId: 'client-1' });
    expect(r.recorded).toBe(true);
  });

  it('annonce inexistante → ignoré', async () => {
    mockPrisma.property.findUnique.mockResolvedValue(null);
    expect((await propertyEventsService.record({ propertyId: 'x', type: 'view' })).recorded).toBe(false);
  });
});
