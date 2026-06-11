// Tests du type de média exclusif par bien (photos | video | threed).
// Couvre : gating par formule (Starter/Business/Entreprise) avec 403 explicite,
// purge atomique des autres types lors d'un changement, no-op si type identique,
// et rejet 409 d'un upload ne correspondant pas au type déclaré du bien.

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:3000' },
  cloudinaryParsed: { cloudName: 'test', apiKey: 'k', apiSecret: 's' },
}));

jest.mock('../../common/utils/maps', () => ({ geocodeAddress: jest.fn() }));
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  subscription: { findUnique: jest.fn() },
  propertyMedia: { deleteMany: jest.fn(async () => ({ count: 0 })), count: jest.fn(async () => 0) },
  property3dScene: { deleteMany: jest.fn(async () => ({ count: 0 })) },
};
// Forme tableau : exécute les promesses passées et renvoie leurs résultats
mockPrisma.$transaction = jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { propertiesService } from './properties.service';

const OWNER = 'pro-1';
const PROPERTY = { id: 'prop-1', ownerId: OWNER, mediaType: 'photos', hasVirtualTour: false };

describe('setMediaType — type de média exclusif', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY });
    mockPrisma.property.update.mockImplementation(async (args: { data: object }) => ({ ...PROPERTY, ...args.data }));
  });

  describe('gating par formule', () => {
    it('Starter : refuse video avec un 403 explicite', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'video'))
        .rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('Business et Entreprise') });
    });

    it('Starter : refuse threed avec un 403 explicite', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'threed'))
        .rejects.toMatchObject({ statusCode: 403, message: expect.stringContaining('Entreprise') });
    });

    it('Business : accepte video, refuse threed', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'video')).resolves.toMatchObject({ mediaType: 'video' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'threed')).rejects.toMatchObject({ statusCode: 403 });
    });

    it('Entreprise : accepte les trois types', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'video')).resolves.toBeDefined();
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'threed')).resolves.toBeDefined();
      // photos : aucun abonnement requis
      mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'video' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'photos')).resolves.toBeDefined();
    });

    it('photos : autorisé même sans abonnement', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'video' });
      await expect(propertiesService.setMediaType('prop-1', OWNER, 'photos')).resolves.toBeDefined();
    });
  });

  describe('purge atomique au changement de type', () => {
    beforeEach(() => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    });

    it('passage à threed : purge toutes les lignes property_media et active hasVirtualTour', async () => {
      await propertiesService.setMediaType('prop-1', OWNER, 'threed');
      expect(mockPrisma.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { mediaType: 'threed', hasVirtualTour: true },
      });
      expect(mockPrisma.propertyMedia.deleteMany).toHaveBeenCalledWith({ where: { propertyId: 'prop-1' } });
      // On reste en threed : pas de purge des scènes
      expect(mockPrisma.property3dScene.deleteMany).not.toHaveBeenCalled();
    });

    it('passage à video : purge les photos et les scènes 3D', async () => {
      await propertiesService.setMediaType('prop-1', OWNER, 'video');
      expect(mockPrisma.propertyMedia.deleteMany).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1', mediaType: { not: 'video' } },
      });
      expect(mockPrisma.property3dScene.deleteMany).toHaveBeenCalledWith({ where: { propertyId: 'prop-1' } });
    });

    it('retour à photos depuis threed : purge les scènes et désactive hasVirtualTour', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'threed' });
      await propertiesService.setMediaType('prop-1', OWNER, 'photos');
      expect(mockPrisma.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { mediaType: 'photos', hasVirtualTour: false },
      });
      expect(mockPrisma.property3dScene.deleteMany).toHaveBeenCalledWith({ where: { propertyId: 'prop-1' } });
    });

    it('no-op si le type demandé est déjà celui du bien (aucune purge)', async () => {
      await propertiesService.setMediaType('prop-1', OWNER, 'photos');
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      expect(mockPrisma.propertyMedia.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('contrôles d\'accès', () => {
    it('404 si le bien n\'existe pas', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(null);
      await expect(propertiesService.setMediaType('inconnu', OWNER, 'photos')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('403 si l\'appelant n\'est pas le propriétaire', async () => {
      await expect(propertiesService.setMediaType('prop-1', 'autre-pro', 'photos')).rejects.toMatchObject({ statusCode: 403 });
    });
  });
});

describe('addMedia — cohérence avec le type exclusif', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('409 si on ajoute une vidéo à un bien configuré en images', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'photos' });
    await expect(
      propertiesService.addMedia('prop-1', OWNER, { url: 'https://x/v.mp4', mediaType: 'video', isPrimary: false, sortOrder: 0 } as never),
    ).rejects.toMatchObject({ statusCode: 409, message: expect.stringContaining('images') });
  });

  it('409 si on ajoute une photo à un bien configuré en vidéo', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'video' });
    await expect(
      propertiesService.addMedia('prop-1', OWNER, { url: 'https://x/p.jpg', mediaType: 'photo', isPrimary: false, sortOrder: 0 } as never),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('400 si on tente un panorama 360° via property_media (chemin déprécié)', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'threed' });
    await expect(
      propertiesService.addMedia('prop-1', OWNER, { url: 'https://x/p.jpg', mediaType: 'virtual_tour_360', isPrimary: false, sortOrder: 0 } as never),
    ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('3d-scenes') });
  });

  it('accepte une photo sur un bien configuré en images', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...PROPERTY, mediaType: 'photos' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockPrisma.propertyMedia.create = jest.fn(async (args: { data: object }) => ({ id: 'm1', ...args.data }));
    await expect(
      propertiesService.addMedia('prop-1', OWNER, { url: 'https://x/p.jpg', mediaType: 'photo', isPrimary: false, sortOrder: 0 } as never),
    ).resolves.toMatchObject({ id: 'm1' });
  });
});
