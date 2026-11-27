// Fiche d'une annonce non publiée : invisible pour les visiteurs (404)
const mockFindUnique = jest.fn();
const mockBookingFind = jest.fn();
jest.mock('../../database/prisma.service', () => ({
  prisma: { property: { findUnique: (...a: unknown[]) => mockFindUnique(...a) }, booking: { findFirst: (...a: unknown[]) => mockBookingFind(...a) } },
}));
jest.mock('../../config/env.config', () => ({ env: { BACKEND_URL: 'http://localhost:3000' }, cloudinaryParsed: { cloudName: 'test', apiKey: 'k', apiSecret: 's' } }));
jest.mock('../../common/utils/maps', () => ({ geocodeAddress: jest.fn().mockResolvedValue(null) }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('../sectors/sectors.service', () => ({ sectorsService: { assertPropertyTypeEnabled: jest.fn(async () => undefined) } }));
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
import { propertiesService } from './properties.service';

const base = { id: 'p1', ownerId: 'owner', propertyType: 'residence', media: [], scenes3d: [], reviews: [], owner: { id: 'owner' } };

describe('getById — visibilité des annonces non actives', () => {
  beforeEach(() => { jest.clearAllMocks(); mockBookingFind.mockResolvedValue(null); });

  it.each(['pending', 'suspended', 'rejected', 'draft'])('annonce %s : 404 pour un visiteur', async (status) => {
    mockFindUnique.mockResolvedValue({ ...base, status });
    await expect(propertiesService.getById('p1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(propertiesService.getById('p1', { id: 'autre', role: 'client' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('annonce en attente : visible par son propriétaire et par un admin', async () => {
    mockFindUnique.mockResolvedValue({ ...base, status: 'pending' });
    await expect(propertiesService.getById('p1', { id: 'owner', role: 'professional_hebergement' })).resolves.toBeTruthy();
    await expect(propertiesService.getById('p1', { id: 'adm', role: 'admin' })).resolves.toBeTruthy();
  });

  it('annonce suspendue : visible par un client qui y a réservé', async () => {
    mockFindUnique.mockResolvedValue({ ...base, status: 'suspended' });
    mockBookingFind.mockResolvedValue({ id: 'b1' });
    await expect(propertiesService.getById('p1', { id: 'client', role: 'client' })).resolves.toBeTruthy();
  });
});
