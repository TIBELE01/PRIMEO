// Tests : duplication d'annonce (brouillon) + hotspots de scènes 3D.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { BACKEND_URL: 'http://api.test' }, cloudinaryParsed: null }));
jest.mock('../../common/utils/maps', () => ({ geocodeAddress: jest.fn() }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn() } }));
jest.mock('./services/search.service', () => ({ searchService: { search: jest.fn() } }));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn(), count: jest.fn(async () => 0), create: jest.fn(async (a: any) => ({ id: 'copy-1', ...a.data })) },
  property3dScene: { findFirst: jest.fn(), findMany: jest.fn(async () => []), update: jest.fn(async (a: any) => ({ id: a.where.id, ...a.data })), createMany: jest.fn(async () => ({})) },
  propertyMedia: { createMany: jest.fn(async () => ({})) },
  subscription: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
};
mockPrisma.$transaction = jest.fn(async (cb: any) => cb({
  property: { create: mockPrisma.property.create },
  propertyMedia: { createMany: mockPrisma.propertyMedia.createMany },
  property3dScene: { createMany: mockPrisma.property3dScene.createMany },
}));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { propertiesService } from './properties.service';

const OWNER = 'pro-1';
const source = (over: Record<string, unknown> = {}) => ({
  id: 'src-1', ownerId: OWNER, propertyType: 'residence', title: 'Villa Cocody', description: 'Belle villa',
  rooms: 5, bedrooms: 4, beds: 5, bathrooms: 2, surface: 200, capacity: 8,
  pricePerNight: 85000, pricePerMonth: null, priceSale: null, cuisineType: null, openingHours: null,
  availableFrom: null, street: 'Rue X', city: 'Abidjan', latitude: 5.3, longitude: -4.0,
  amenities: ['wifi'], paymentOptions: ['full_online'], rules: null, floor: null, yearBuilt: null,
  availabilityDate: null, diagnostics: null, roomTypes: null, hasVirtualTour: true, mediaType: 'threed',
  media: [{ url: 'u1', publicId: 'p1', mediaType: 'photo', isPrimary: true, sortOrder: 0 }],
  scenes3d: [{ id: 'sc-1', roomName: 'Salon', url: 'su1', publicId: 'sp1', sortOrder: 0, hotspots: [] }],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement' });
});

describe('duplicate', () => {
  it('crée une copie en BROUILLON avec « (copie) » + médias + scènes', async () => {
    mockPrisma.property.findUnique.mockResolvedValue(source());
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', extraPublicationSlots: 0 });
    mockPrisma.property.count.mockResolvedValue(2); // sous la limite Business (10)

    const copy = await propertiesService.duplicate('src-1', OWNER);

    expect(mockPrisma.property.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: 'Villa Cocody (copie)', status: 'draft', ownerId: OWNER, hasVirtualTour: true }),
    }));
    expect(mockPrisma.propertyMedia.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ propertyId: 'copy-1', url: 'u1', isPrimary: true })],
    }));
    expect(mockPrisma.property3dScene.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: [expect.objectContaining({ propertyId: 'copy-1', roomName: 'Salon', url: 'su1' })],
    }));
    expect(copy).toMatchObject({ id: 'copy-1', status: 'draft' });
  });

  it('refuse un non-propriétaire (403)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue(source());
    await expect(propertiesService.duplicate('src-1', 'intrus')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('refuse si la limite de publications est atteinte (403)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue(source());
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter', extraPublicationSlots: 0 }); // limite 3
    mockPrisma.property.count.mockResolvedValue(3);
    await expect(propertiesService.duplicate('src-1', OWNER)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('404 si la source est introuvable', async () => {
    mockPrisma.property.findUnique.mockResolvedValue(null);
    await expect(propertiesService.duplicate('nope', OWNER)).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('updateScene3d — hotspots', () => {
  beforeEach(() => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'prop-1', ownerId: OWNER });
    mockPrisma.property3dScene.findFirst.mockResolvedValue({ id: 'sc-1', propertyId: 'prop-1' });
    mockPrisma.property3dScene.findMany.mockResolvedValue([{ id: 'sc-1' }, { id: 'sc-2' }]);
  });

  it('enregistre des hotspots valides (cible existante)', async () => {
    const res = await propertiesService.updateScene3d('prop-1', 'sc-1', OWNER, {
      hotspots: [{ targetSceneId: 'sc-2', label: 'Aller au salon', theta: 1.2, phi: 1.57 }],
    });
    expect(mockPrisma.property3dScene.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'sc-1' },
      data: expect.objectContaining({ hotspots: expect.arrayContaining([expect.objectContaining({ targetSceneId: 'sc-2', label: 'Aller au salon' })]) }),
    }));
    expect(res).toBeDefined();
  });

  it('refuse un hotspot vers une pièce inexistante (400)', async () => {
    await expect(propertiesService.updateScene3d('prop-1', 'sc-1', OWNER, {
      hotspots: [{ targetSceneId: 'ghost', theta: 0, phi: 1.57 }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('refuse un hotspot pointant vers la scène elle-même (400)', async () => {
    await expect(propertiesService.updateScene3d('prop-1', 'sc-1', OWNER, {
      hotspots: [{ targetSceneId: 'sc-1', theta: 0, phi: 1.57 }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('met à jour seulement le nom de pièce', async () => {
    await propertiesService.updateScene3d('prop-1', 'sc-1', OWNER, { roomName: 'Chambre' });
    expect(mockPrisma.property3dScene.update).toHaveBeenCalledWith(expect.objectContaining({ data: { roomName: 'Chambre' } }));
  });

  it('refuse un non-propriétaire (403)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'prop-1', ownerId: 'autre' });
    await expect(propertiesService.updateScene3d('prop-1', 'sc-1', OWNER, { roomName: 'X' })).rejects.toMatchObject({ statusCode: 403 });
  });
});
