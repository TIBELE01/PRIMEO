// Tests : visite virtuelle 3D — disponibilité selon la formule du propriétaire,
// interrupteur admin, et validation du format équirectangulaire (2:1) à l'upload.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { BACKEND_URL: 'http://api.test' }, cloudinaryParsed: null }));
jest.mock('../../common/utils/maps', () => ({ geocodeAddress: jest.fn() }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn() } }));
jest.mock('./services/search.service', () => ({ searchService: { search: jest.fn() } }));

const mockOverrides: { features?: Record<string, boolean> } = {};
jest.mock('../../common/settings/runtime-config', () => ({ getRuntimeOverrides: () => mockOverrides }));

const mockUpload = jest.fn();
const mockDelete = jest.fn(async () => undefined);
jest.mock('../../common/utils/s3-client', () => ({
  uploadToCloudinary: (...a: unknown[]) => mockUpload(...a),
  deleteFromCloudinary: (...a: unknown[]) => mockDelete(...(a as [])),
  renameCloudinaryAsset: jest.fn(),
  setCloudinaryAssetFolder: jest.fn(),
}));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn(), update: jest.fn(async () => ({})) },
  property3dScene: { count: jest.fn(async () => 0), create: jest.fn(async (a: any) => ({ id: 'sc-new', ...a.data })) },
  subscription: { findUnique: jest.fn() },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { serializeProperty, propertiesService } from './properties.service';

const scenes = [
  { id: 's1', roomName: 'Salon', url: 'https://res.cloudinary.com/x/image/upload/v1/a.jpg', hotspots: [{ targetSceneId: 's2', label: 'Chambre', theta: 1, phi: 1.57 }] },
  { id: 's2', roomName: 'Chambre', url: 'https://res.cloudinary.com/x/image/upload/v1/b.jpg', hotspots: [] },
];
const prop = (planType: string | null) => ({
  id: 'p1', owner: { id: 'o1', subscription: planType ? { planType } : null }, media: [], scenes3d: scenes,
});

beforeEach(() => {
  jest.clearAllMocks();
  delete mockOverrides.features;
});

describe('virtualTour — disponibilité', () => {
  it('Entreprise : visite disponible avec scènes et hotspots', () => {
    const out = serializeProperty(prop('entreprise') as any) as any;
    expect(out.virtualTour.available).toBe(true);
    expect(out.virtualTour.panoramas).toHaveLength(2);
    expect(out.virtualTour.panoramas[0].hotspots[0]).toMatchObject({ targetPanoramaId: 's2', label: 'Chambre' });
  });

  it.each(['starter', 'business'])('formule %s : visite non proposée', (plan) => {
    const out = serializeProperty(prop(plan) as any) as any;
    expect(out.virtualTour).toEqual({ available: false, panoramas: [] });
  });

  it('sans abonnement : visite non proposée', () => {
    expect((serializeProperty(prop(null) as any) as any).virtualTour.available).toBe(false);
  });

  it('interrupteur admin désactivé : visite non proposée même en Entreprise', () => {
    mockOverrides.features = { virtualTourEnabled: false };
    expect((serializeProperty(prop('entreprise') as any) as any).virtualTour.available).toBe(false);
  });
});

describe('upload3dScene — format équirectangulaire', () => {
  const file = { buffer: Buffer.from('x'), originalname: 'pano.jpg', mimetype: 'image/jpeg' } as any;
  beforeEach(() => {
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'p1', ownerId: 'o1', mediaType: 'threed', propertyType: 'residence', hasVirtualTour: false });
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
  });

  it('accepte une image 2:1 et active la visite', async () => {
    mockUpload.mockResolvedValue({ url: 'u', publicId: 'pid', width: 4096, height: 2048 });
    const scene = await propertiesService.upload3dScene('p1', 'o1', file, { roomName: 'Salon', sortOrder: 0 });
    expect(scene).toMatchObject({ roomName: 'Salon', url: 'u' });
    expect(mockPrisma.property.update).toHaveBeenCalledWith(expect.objectContaining({ data: { hasVirtualTour: true } }));
  });

  it('refuse une photo classique (4:3) et supprime le fichier téléversé', async () => {
    mockUpload.mockResolvedValue({ url: 'u', publicId: 'pid', width: 4000, height: 3000 });
    await expect(propertiesService.upload3dScene('p1', 'o1', file, { roomName: 'Salon', sortOrder: 0 }))
      .rejects.toMatchObject({ statusCode: 400 });
    expect(mockDelete).toHaveBeenCalledWith('pid', 'image');
    expect(mockPrisma.property3dScene.create).not.toHaveBeenCalled();
  });

  it('refuse si la formule ne comprend plus la visite 3D', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    await expect(propertiesService.upload3dScene('p1', 'o1', file, { roomName: 'Salon', sortOrder: 0 }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
