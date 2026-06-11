// Tests unitaires — visite 3D : upload scènes 360°, gating Entreprise, limites

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

const mockUpload3dScene = jest.fn();
const mockList3dScenes = jest.fn();
const mockDelete3dScene = jest.fn();
jest.mock('./properties.service', () => ({
  propertiesService: {
    upload3dScene: mockUpload3dScene,
    list3dScenes: mockList3dScenes,
    delete3dScene: mockDelete3dScene,
    uploadAndSaveMedia: jest.fn(),
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

import { upload3dScene, list3dScenes, delete3dScene } from './properties.controller';

function makeFile(mimetype: string): Express.Multer.File {
  return {
    mimetype,
    size: 5 * 1024 * 1024,
    originalname: `pano.${mimetype.split('/')[1]}`,
    buffer: Buffer.alloc(0),
    fieldname: 'file',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: null as any,
  };
}

function makeReq(overrides: Partial<{ file: any; body: any; user: any; params: any }> = {}): any {
  return {
    file: makeFile('image/jpeg'),
    body: { roomName: 'Salon', sortOrder: '0' },
    user: { sub: 'user-1' },
    params: { id: 'property-1', sceneId: 'scene-1' },
    ...overrides,
  };
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  return res;
}

const next = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Validation MIME ───────────────────────────────────────────────────────────

describe('upload3dScene — validation MIME', () => {
  it('rejette sans fichier', async () => {
    const req = makeReq({ file: undefined });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('accepte image/jpeg', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's1', roomName: 'Salon', url: 'https://x/p.jpg' });
    const req = makeReq({ file: makeFile('image/jpeg') });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('accepte image/png', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's2', roomName: 'Salon', url: 'https://x/p.png' });
    const req = makeReq({ file: makeFile('image/png') });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('accepte image/webp', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's3', roomName: 'Salon', url: 'https://x/p.webp' });
    const req = makeReq({ file: makeFile('image/webp') });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('rejette video/mp4', async () => {
    const req = makeReq({ file: makeFile('video/mp4') });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('JPEG'),
    }));
  });

  it('rejette image/gif', async () => {
    const req = makeReq({ file: makeFile('image/gif') });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ── Gating Entreprise ─────────────────────────────────────────────────────────

describe('upload3dScene — gating formule Entreprise', () => {
  it('refuse Starter (403)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'starter' });
    const req = makeReq();
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining('Entreprise'),
    }));
  });

  it('refuse Business (403) — la 3D est Entreprise uniquement', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business' });
    const req = makeReq();
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('refuse sans abonnement (403)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    const req = makeReq();
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('autorise Entreprise (201)', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's4', roomName: 'Salon', url: 'https://x/p.jpg' });
    const req = makeReq();
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

// ── roomName ──────────────────────────────────────────────────────────────────

describe('upload3dScene — roomName', () => {
  it('transmet le roomName au service', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's5' });
    const req = makeReq({ body: { roomName: 'Chambre parentale', sortOrder: '3' } });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(mockUpload3dScene).toHaveBeenCalledWith(
      'property-1', 'user-1', expect.anything(),
      { roomName: 'Chambre parentale', sortOrder: 3 },
    );
  });

  it('utilise "Pièce" par défaut si roomName vide', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'entreprise' });
    mockUpload3dScene.mockResolvedValue({ id: 's6' });
    const req = makeReq({ body: { roomName: '  ', sortOrder: '0' } });
    const res = makeRes();
    await upload3dScene(req, res, next);
    expect(mockUpload3dScene).toHaveBeenCalledWith(
      'property-1', 'user-1', expect.anything(),
      { roomName: 'Pièce', sortOrder: 0 },
    );
  });
});

// ── Liste et suppression ──────────────────────────────────────────────────────

describe('list3dScenes / delete3dScene', () => {
  it('liste les scènes de la propriété', async () => {
    const scenes = [{ id: 's1', roomName: 'Salon', url: 'https://x/1.jpg' }];
    mockList3dScenes.mockResolvedValue(scenes);
    const req = makeReq();
    const res = makeRes();
    await list3dScenes(req, res, next);
    expect(mockList3dScenes).toHaveBeenCalledWith('property-1');
    expect(res.json).toHaveBeenCalledWith(scenes);
  });

  it('supprime une scène (204)', async () => {
    mockDelete3dScene.mockResolvedValue(undefined);
    const req = makeReq();
    const res = makeRes();
    await delete3dScene(req, res, next);
    expect(mockDelete3dScene).toHaveBeenCalledWith('property-1', 'scene-1', 'user-1');
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('propage les erreurs du service à next()', async () => {
    const boom = new Error('Propriété introuvable');
    mockList3dScenes.mockRejectedValue(boom);
    const req = makeReq();
    const res = makeRes();
    await list3dScenes(req, res, next);
    expect(next).toHaveBeenCalledWith(boom);
  });
});
