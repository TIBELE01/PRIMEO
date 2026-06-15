// Tests unitaires — propertiesService.create : limite de publications + géolocalisation

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:4000' },
  cloudinaryParsed: { cloudName: 'test', apiKey: 'k', apiSecret: 's' },
}));

jest.mock('../../common/utils/maps', () => ({
  geocodeAddress: jest.fn(async (_addr: string) => null),
}));

jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma = {
  property: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  professionalProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  subscription: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

// ── Imports ───────────────────────────────────────────────────────────────────

import { propertiesService } from './properties.service';
import type { CreatePropertyInput } from './dto/property.dto';
import { geocodeAddress } from '../../common/utils/maps';

const mockGeocode = geocodeAddress as jest.Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────────

const OWNER_ID = 'pro-owner-1';

const baseInput: CreatePropertyInput = {
  title: 'Villa Sunset',
  propertyType: 'residence',
  description: 'Belle villa avec piscine au bord de la lagune',
  city: 'Abidjan',
  street: 'Rue des Flamboyants',
  pricePerNight: 75_000,
  paymentOptions: ['full_online'],
  amenities: [],
};

function sub(planType = 'starter', extraPublicationSlots = 0) {
  return { planType, extraPublicationSlots, status: 'active' };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('propertiesService.create — limite de publications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement', firstName: 'Aya', lastName: 'K' });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ id: 'prof-1' });
    mockPrisma.subscription.findUnique.mockResolvedValue(sub('starter'));
    mockPrisma.property.create.mockResolvedValue({
      id: 'prop-new', ...baseInput, status: 'pending', ownerId: OWNER_ID,
    });
  });

  it('crée la propriété quand un slot est disponible (Starter, 2 actives sur 3)', async () => {
    mockPrisma.property.count.mockResolvedValue(2); // 2/3 → 1 slot libre

    const result = await propertiesService.create(OWNER_ID, baseInput);

    expect(result).toMatchObject({ id: 'prop-new', status: 'pending' });
    expect(mockPrisma.property.create).toHaveBeenCalled();
  });

  it('rejette avec 403 quand le propriétaire atteint la limite Starter (3 actives)', async () => {
    mockPrisma.property.count.mockResolvedValue(3); // 3/3 → limite atteinte

    await expect(propertiesService.create(OWNER_ID, baseInput)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockPrisma.property.create).not.toHaveBeenCalled();
  });

  it('autorise la création Business quand un slot est disponible (9 actives sur 10)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub('business'));
    mockPrisma.property.count.mockResolvedValue(9); // 9/10 → 1 slot libre

    const result = await propertiesService.create(OWNER_ID, baseInput);

    expect(result).toMatchObject({ id: 'prop-new' });
  });

  it('rejette avec 403 quand la limite Business est atteinte (10/10)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(sub('business'));
    mockPrisma.property.count.mockResolvedValue(10); // 10/10 → limite atteinte

    await expect(propertiesService.create(OWNER_ID, baseInput)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('ne bloque pas si le professionnel n\'a pas encore d\'abonnement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null); // pas d'abonnement → pas de limite
    mockPrisma.property.count.mockResolvedValue(99);

    const result = await propertiesService.create(OWNER_ID, baseInput);

    expect(result).toMatchObject({ id: 'prop-new' });
  });

  it('crée automatiquement le profil professionnel s\'il est absent', async () => {
    mockPrisma.professionalProfile.findUnique.mockResolvedValue(null);
    mockPrisma.professionalProfile.create.mockResolvedValue({ id: 'prof-new' });
    mockPrisma.property.count.mockResolvedValue(0);

    await propertiesService.create(OWNER_ID, baseInput);

    expect(mockPrisma.professionalProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: OWNER_ID, verificationStatus: 'pending' }) }),
    );
  });
});

describe('propertiesService.create — géolocalisation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement', firstName: 'Aya', lastName: 'K' });
    mockPrisma.professionalProfile.findUnique.mockResolvedValue({ id: 'prof-1' });
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    mockPrisma.property.count.mockResolvedValue(0);
  });

  it('utilise les coordonnées fournies sans appeler le géocodeur', async () => {
    const inputWithCoords: CreatePropertyInput = { ...baseInput, latitude: 5.3599, longitude: -4.0083 };
    mockPrisma.property.create.mockResolvedValue({ id: 'prop-geo', ...inputWithCoords, status: 'pending', ownerId: OWNER_ID });

    await propertiesService.create(OWNER_ID, inputWithCoords);

    expect(mockGeocode).not.toHaveBeenCalled();
    expect(mockPrisma.property.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ latitude: 5.3599, longitude: -4.0083 }) }),
    );
  });

  it('géocode l\'adresse quand les coordonnées sont absentes', async () => {
    mockGeocode.mockResolvedValueOnce({ coordinates: { lat: 5.3599, lon: -4.0083 } });
    mockPrisma.property.create.mockResolvedValue({ id: 'prop-geo', status: 'pending' });

    await propertiesService.create(OWNER_ID, baseInput);

    expect(mockGeocode).toHaveBeenCalledWith("Rue des Flamboyants, Abidjan, Côte d'Ivoire");
    expect(mockPrisma.property.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ latitude: 5.3599, longitude: -4.0083 }) }),
    );
  });

  it('crée la propriété sans coordonnées si le géocodeur échoue (dégradé)', async () => {
    mockGeocode.mockResolvedValueOnce(null);
    mockPrisma.property.create.mockResolvedValue({ id: 'prop-no-geo', status: 'pending' });

    await expect(propertiesService.create(OWNER_ID, baseInput)).resolves.toMatchObject({ id: 'prop-no-geo' });
  });
});
