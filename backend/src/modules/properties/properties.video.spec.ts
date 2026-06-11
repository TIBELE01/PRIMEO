// Tests unitaires — validation upload vidéo : MIME, comptage, droits abonnement

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../common/utils/maps', () => ({
  autocompleteAddress: jest.fn(),
}));

const mockPrisma = {
  subscription: { findUnique: jest.fn() },
  propertyMedia: { count: jest.fn() },
};

jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

jest.mock('../../common/constants/subscription-plans', () => ({
  PLAN_DETAILS: {
    starter:    { videoUpload: false, virtualTour: false },
    business:   { videoUpload: true,  virtualTour: false },
    entreprise: { videoUpload: true,  virtualTour: true  },
  },
}));

const mockUploadAndSaveMedia = jest.fn();
jest.mock('./properties.service', () => ({
  propertiesService: {
    uploadAndSaveMedia: mockUploadAndSaveMedia,
    signUpload: jest.fn(),
    addMedia: jest.fn(),
    deleteMedia: jest.fn(),
    getStats: jest.fn(),
    suspend: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    expressInterest: jest.fn(),
    search: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    publish: jest.fn(),
    getByOwner: jest.fn(),
    ensureRestaurant: jest.fn(),
  },
}));

import { uploadMediaFile } from './properties.controller';

function makeFile(mimetype: string, sizeMb = 10): Express.Multer.File {
  return {
    mimetype,
    size: sizeMb * 1024 * 1024,
    originalname: `test.${mimetype.split('/')[1]}`,
    buffer: Buffer.alloc(0),
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };
}

function makeReq(overrides: Partial<{
  file: any; body: any; user: any; params: any;
}> = {}): any {
  return {
    file: makeFile('video/mp4'),
    body: { mediaType: 'video', isPrimary: 'false', sortOrder: '0' },
    user: { sub: 'user-1' },
    params: { id: 'property-1' },
    ...overrides,
  };
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── MIME type validation ──────────────────────────────────────────────────────

describe('uploadMediaFile — MIME type validation', () => {
  it('rejects files with no file attached', async () => {
    const req = makeReq({ file: undefined });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Aucun fichier reçu' });
  });

  it('accepts video/mp4', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm1', url: 'https://example.com/v.mp4' });
    const req = makeReq({ file: makeFile('video/mp4') });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('accepts video/quicktime (MOV)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm2', url: 'https://example.com/v.mov' });
    const req = makeReq({ file: makeFile('video/quicktime') });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('accepts video/x-msvideo (AVI)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm3', url: 'https://example.com/v.avi' });
    const req = makeReq({ file: makeFile('video/x-msvideo') });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejects video/webm (unsupported format)', async () => {
    const req = makeReq({ file: makeFile('video/webm') });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('MP4'),
    }));
  });

  it('rejects image/* files sent as video mediaType', async () => {
    const req = makeReq({
      file: makeFile('image/jpeg'),
      body: { mediaType: 'video' },
    });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Format vidéo'),
    }));
  });
});

// ── Subscription plan gating ──────────────────────────────────────────────────

describe('uploadMediaFile — subscription plan gating', () => {
  it('returns 403 for Starter plan trying to upload a video', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Business'),
    }));
  });

  it('returns 403 when no subscription (null plan)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('allows Business plan to upload a video', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm4', url: 'https://example.com/v.mp4' });
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('allows Entreprise plan to upload a video', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm5', url: 'https://example.com/v.mp4' });
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 403 for Starter plan trying to upload a 3D tour', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
    const req = makeReq({
      file: makeFile('image/jpeg'),
      body: { mediaType: 'virtual_tour_360' },
    });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Entreprise'),
    }));
  });

  it('returns 403 for Business plan trying to upload a 3D tour', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    const req = makeReq({
      file: makeFile('image/jpeg'),
      body: { mediaType: 'virtual_tour_360' },
    });
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// ── Video count limit ─────────────────────────────────────────────────────────

describe('uploadMediaFile — 2-video-per-property limit', () => {
  it('rejects upload when property already has 2 videos', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(2);
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('2'),
    }));
  });

  it('rejects upload when property already has 1 video and limit is 2', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    mockPrisma.propertyMedia.count.mockResolvedValue(1);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm6', url: 'https://example.com/v2.mp4' });
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    // 1 existing → still allowed (< 2)
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('counts only videos, not photos, toward the video limit', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    // 10 photos but 0 videos — video should be allowed
    mockPrisma.propertyMedia.count.mockResolvedValue(0);
    mockUploadAndSaveMedia.mockResolvedValue({ id: 'm7', url: 'https://example.com/v.mp4' });
    const req = makeReq();
    const res = makeRes();
    await uploadMediaFile(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    // Verify the count query filtered by mediaType: 'video'
    expect(mockPrisma.propertyMedia.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ mediaType: 'video' }),
      }),
    );
  });
});
