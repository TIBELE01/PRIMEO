// Tests : vidéo des biens — URLs dérivées, réservation Business/Entreprise, poster de couverture,
// contrôle de formule sur tous les chemins d'upload.
jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../config/env.config', () => ({ env: { BACKEND_URL: 'http://api.test' }, cloudinaryParsed: null }));
jest.mock('../../common/utils/maps', () => ({ geocodeAddress: jest.fn() }));
jest.mock('../notifications/notifications.service', () => ({ notificationsService: { notify: jest.fn() } }));
jest.mock('./services/search.service', () => ({ searchService: { search: jest.fn() } }));
jest.mock('../../common/settings/runtime-config', () => ({ getRuntimeOverrides: () => ({}) }));

const mockUpload = jest.fn();
jest.mock('../../common/utils/s3-client', () => ({
  uploadToCloudinary: (...a: unknown[]) => mockUpload(...a),
  deleteFromCloudinary: jest.fn(async () => undefined),
  renameCloudinaryAsset: jest.fn(),
  setCloudinaryAssetFolder: jest.fn(),
}));

const mockPrisma: Record<string, any> = {
  property: { findUnique: jest.fn() },
  propertyMedia: { count: jest.fn(async () => 0), create: jest.fn(async (a: any) => ({ id: 'm1', ...a.data })), updateMany: jest.fn() },
  subscription: { findUnique: jest.fn() },
};
mockPrisma.$transaction = jest.fn(async (cb: any) => cb(mockPrisma));
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { serializeProperty, propertiesService } from './properties.service';
import { videoPosterUrl, videoPlaybackUrl, panoramaCoverUrl } from './media-urls';

const VID = 'https://res.cloudinary.com/x/video/upload/v1/primeo/Properties/Residences/p1/videos/tour.mp4';

describe('media-urls', () => {
  it('poster JPEG extrait à 1 s', () => {
    expect(videoPosterUrl(VID)).toBe('https://res.cloudinary.com/x/video/upload/so_1,c_fill,g_auto,w_900,h_600,q_auto/v1/primeo/Properties/Residences/p1/videos/tour.jpg');
  });
  it('lecture allégée 1280 px H.264, .mov → .mp4', () => {
    expect(videoPlaybackUrl(VID)).toContain('/video/upload/c_limit,w_1280,q_auto,vc_h264/v1/');
    expect(videoPlaybackUrl(VID.replace('.mp4', '.mov'))).toMatch(/\.mp4$/);
  });
  it('URL non Cloudinary inchangée / sans poster', () => {
    expect(videoPlaybackUrl('https://cdn.example/v.mp4')).toBe('https://cdn.example/v.mp4');
    expect(videoPosterUrl('https://cdn.example/v.mp4')).toBeNull();
    expect(panoramaCoverUrl('https://cdn.example/p.jpg')).toBe('https://cdn.example/p.jpg');
  });
});

describe('serializeProperty — vidéo', () => {
  const prop = (planType: string | null) => ({
    id: 'p1', owner: { subscription: planType ? { planType } : null },
    media: [{ id: 'm1', url: VID, mediaType: 'video', isPrimary: false }],
  });

  it.each(['business', 'entreprise'])('formule %s : vidéo exposée + poster en couverture', (plan) => {
    const out = serializeProperty(prop(plan) as any) as any;
    expect(out.video).toEqual({ url: videoPlaybackUrl(VID), originalUrl: VID, posterUrl: videoPosterUrl(VID) });
    expect(out.mainImageUrl).toBe(videoPosterUrl(VID)); // jamais l'URL .mp4 dans une balise image
    expect(out.images).toHaveLength(1);
  });

  it('formule Starter : vidéo masquée', () => {
    const out = serializeProperty(prop('starter') as any) as any;
    expect(out.video).toBeUndefined();
    expect(out.images).toHaveLength(0);
    expect(out.mainImageUrl).toBeNull();
  });

  it('une photo principale reste prioritaire sur le poster', () => {
    const out = serializeProperty({ ...prop('entreprise'), media: [{ url: VID, mediaType: 'video' }, { url: 'https://x/p.jpg', mediaType: 'photo', isPrimary: true }] } as any) as any;
    expect(out.mainImageUrl).toBe('https://x/p.jpg');
  });
});

describe('upload vidéo — formule et limite', () => {
  const file = { buffer: Buffer.from('x'), originalname: 'tour.mp4', mimetype: 'video/mp4' } as any;
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.property.findUnique.mockResolvedValue({ id: 'p1', ownerId: 'o1', mediaType: 'video', propertyType: 'residence' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUpload.mockResolvedValue({ url: VID, publicId: 'pid' });
  });

  it('Business : upload accepté, version de lecture préparée dès l\'upload (eager)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    await propertiesService.uploadAndSaveMedia('p1', 'o1', file, { mediaType: 'video', isPrimary: false, sortOrder: 0 });
    expect(mockUpload).toHaveBeenCalledWith(file.buffer, expect.any(String), 'tour.mp4', 'video',
      { eager: 'c_limit,w_1280,q_auto,vc_h264/mp4', eagerAsync: true });
  });

  it('Starter : refusé (403) avant tout stockage', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
    await expect(propertiesService.uploadAndSaveMedia('p1', 'o1', file, { mediaType: 'video', isPrimary: false, sortOrder: 0 }))
      .rejects.toMatchObject({ statusCode: 403 });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('upload direct (addMedia) : Starter refusé, 2e vidéo refusée', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
    await expect(propertiesService.addMedia('p1', 'o1', { url: VID, publicId: 'pid', mediaType: 'video' } as any))
      .rejects.toMatchObject({ statusCode: 403 });
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockPrisma.propertyMedia.count.mockResolvedValue(1);
    await expect(propertiesService.addMedia('p1', 'o1', { url: VID, publicId: 'pid', mediaType: 'video' } as any))
      .rejects.toMatchObject({ statusCode: 400 });
  });
});
