// Secteurs activables par l'admin (cartes de l'accueil) : service + endpoints HTTP.
//   GET /api/config/features            (public)
//   GET|PUT /api/admin/config/features  (admin uniquement)

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// platform_config simulée en mémoire
const store = new Map<string, unknown>();
let dbDown = false;
const mockAuditCreate = jest.fn(async (_args: unknown) => ({}));
jest.mock('../../database/prisma.service', () => ({
  prisma: {
    platformConfig: {
      findUnique: jest.fn(async ({ where }: { where: { key: string } }) => {
        if (dbDown) throw new Error('db down');
        return store.has(where.key) ? { key: where.key, value: store.get(where.key) } : null;
      }),
      upsert: jest.fn(async ({ where, create, update }: { where: { key: string }; create: { value: unknown }; update: { value: unknown } }) => {
        store.set(where.key, store.has(where.key) ? update.value : create.value);
        return {};
      }),
    },
    auditLog: { create: (args: unknown) => mockAuditCreate(args) },
  },
}));

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { sectorsService, sectorOfPropertyType, sectorOfAccountType, SECTOR_CONFIG_KEY } from './sectors.service';
import { sectorsConfigRouter, adminGetSectorFlags, adminUpdateSectorFlags } from './sectors.router';
import { authorize } from '../../common/middleware/roles.middleware';
import { handleHttpError } from '../../common/handlers/http-error.handler';

const ALL_ON = { residence_enabled: true, hotel_enabled: true, immobilier_enabled: true, restaurant_enabled: true };

// Application de test : mêmes handlers et même garde de rôle que l'API réelle ;
// seule l'identité vient d'un en-tête (au lieu de Supabase Auth).
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', sectorsConfigRouter);
  const fakeAuth = (req: Request, res: Response, next: NextFunction) => {
    const role = req.headers['x-test-role'] as string | undefined;
    if (!role) { res.status(401).json({ error: 'Authentication required' }); return; }
    req.user = { sub: 'user-1', email: 'u@test.ci', role: role as never };
    next();
  };
  app.get('/api/admin/config/features', fakeAuth, authorize('admin'), adminGetSectorFlags);
  app.put('/api/admin/config/features', fakeAuth, authorize('admin'), adminUpdateSectorFlags);
  app.use(handleHttpError);
  return app;
}

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  dbDown = false;
  sectorsService._resetCache();
});

describe('correspondances', () => {
  it('rattache chaque type d\'annonce à son secteur', () => {
    expect(sectorOfPropertyType('residence')).toBe('residence');
    expect(sectorOfPropertyType('hotel')).toBe('hotel');
    expect(sectorOfPropertyType('immobilier_location')).toBe('immobilier');
    expect(sectorOfPropertyType('immobilier_terrain')).toBe('immobilier');
    expect(sectorOfPropertyType('immobilier_achat')).toBe('immobilier');
    expect(sectorOfPropertyType('restaurant')).toBe('restaurant');
    expect(sectorOfPropertyType('inconnu')).toBeNull();
  });

  it('rattache chaque type de compte professionnel à son secteur ; client et admin à aucun', () => {
    expect(sectorOfAccountType('professional_hebergement')).toBe('residence');
    expect(sectorOfAccountType('professional_hotel')).toBe('hotel');
    expect(sectorOfAccountType('professional_immobilier')).toBe('immobilier');
    expect(sectorOfAccountType('restaurateur')).toBe('restaurant');
    expect(sectorOfAccountType('client')).toBeNull();
    expect(sectorOfAccountType('admin')).toBeNull();
  });
});

describe('sectorsService', () => {
  it('tout est activé par défaut (aucune ligne en base)', async () => {
    expect(await sectorsService.getStates()).toEqual({ residence: true, hotel: true, immobilier: true, restaurant: true });
    expect(await sectorsService.getDisabledPropertyTypes()).toEqual([]);
  });

  it('désactiver Restaurant bloque son type d\'annonce et son type de compte, pas les autres', async () => {
    await sectorsService.setStates({ restaurant: false }, 'admin-1');

    await expect(sectorsService.assertPropertyTypeEnabled('restaurant')).rejects.toMatchObject({
      statusCode: 503, details: { code: 'SECTOR_DISABLED', sector: 'restaurant' },
    });
    await expect(sectorsService.assertAccountTypeEnabled('restaurateur')).rejects.toMatchObject({ statusCode: 503 });

    await expect(sectorsService.assertPropertyTypeEnabled('hotel')).resolves.toBeUndefined();
    await expect(sectorsService.assertAccountTypeEnabled('professional_hotel')).resolves.toBeUndefined();
    await expect(sectorsService.assertAccountTypeEnabled('client')).resolves.toBeUndefined();
    expect(await sectorsService.getDisabledPropertyTypes()).toEqual(['restaurant']);
  });

  it('désactiver Immobilier masque ses trois types d\'annonce', async () => {
    await sectorsService.setStates({ immobilier: false }, 'admin-1');
    expect(await sectorsService.getDisabledPropertyTypes())
      .toEqual(['immobilier_location', 'immobilier_terrain', 'immobilier_achat']);
  });

  it('réactiver rétablit tout', async () => {
    await sectorsService.setStates({ restaurant: false }, 'admin-1');
    await sectorsService.setStates({ restaurant: true }, 'admin-1');
    await expect(sectorsService.assertPropertyTypeEnabled('restaurant')).resolves.toBeUndefined();
    expect(await sectorsService.getDisabledPropertyTypes()).toEqual([]);
  });

  it('une modification partielle ne touche pas les autres secteurs', async () => {
    await sectorsService.setStates({ hotel: false }, 'admin-1');
    const states = await sectorsService.setStates({ restaurant: false }, 'admin-1');
    expect(states).toEqual({ residence: true, hotel: false, immobilier: true, restaurant: false });
    expect(store.get(SECTOR_CONFIG_KEY)).toEqual(states);
  });

  it('trace chaque bascule dans le journal d\'audit (et rien si aucun changement)', async () => {
    await sectorsService.setStates({ restaurant: false }, 'admin-1');
    expect(mockAuditCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ userId: 'admin-1', action: 'admin.sectors.update', description: 'Restaurant désactivé' }),
    }));
    mockAuditCreate.mockClear();
    await sectorsService.setStates({ restaurant: false }, 'admin-1');
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('une panne de base ne ferme pas la plateforme : tout reste activé', async () => {
    dbDown = true;
    expect(await sectorsService.getStates()).toEqual({ residence: true, hotel: true, immobilier: true, restaurant: true });
    await expect(sectorsService.assertPropertyTypeEnabled('restaurant')).resolves.toBeUndefined();
  });

  it('seul un false explicite désactive (valeur corrompue en base ⇒ activé)', async () => {
    store.set(SECTOR_CONFIG_KEY, { restaurant: 'non', hotel: null, residence: 0 });
    expect(await sectorsService.getStates(true)).toEqual({ residence: true, hotel: true, immobilier: true, restaurant: true });
  });
});

describe('endpoints', () => {
  it('GET /api/config/features est public et renvoie les quatre états', async () => {
    const res = await request(buildApp()).get('/api/config/features');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(ALL_ON);
    expect(res.headers['cache-control']).toBe('no-store');
  });

  it('PUT /api/admin/config/features : admin → enregistré et visible aussitôt côté public', async () => {
    const app = buildApp();
    const put = await request(app).put('/api/admin/config/features').set('x-test-role', 'admin').send({ restaurant_enabled: false });
    expect(put.status).toBe(200);
    expect(put.body).toEqual({ ...ALL_ON, restaurant_enabled: false });

    const pub = await request(app).get('/api/config/features');
    expect(pub.body.restaurant_enabled).toBe(false);

    const adminGet = await request(app).get('/api/admin/config/features').set('x-test-role', 'admin');
    expect(adminGet.body).toEqual({ ...ALL_ON, restaurant_enabled: false });
  });

  it('PUT puis réactivation', async () => {
    const app = buildApp();
    await request(app).put('/api/admin/config/features').set('x-test-role', 'admin').send({ restaurant_enabled: false });
    const back = await request(app).put('/api/admin/config/features').set('x-test-role', 'admin').send({ restaurant_enabled: true });
    expect(back.body).toEqual(ALL_ON);
    expect((await request(app).get('/api/config/features')).body).toEqual(ALL_ON);
  });

  it('refuse l\'écriture et la lecture admin sans authentification (401)', async () => {
    const app = buildApp();
    expect((await request(app).put('/api/admin/config/features').send({ restaurant_enabled: false })).status).toBe(401);
    expect((await request(app).get('/api/admin/config/features')).status).toBe(401);
    expect((await request(app).get('/api/config/features')).body).toEqual(ALL_ON);
  });

  it('refuse l\'écriture à un compte non admin (403)', async () => {
    const app = buildApp();
    for (const role of ['client', 'restaurateur', 'professional_hotel']) {
      const res = await request(app).put('/api/admin/config/features').set('x-test-role', role).send({ restaurant_enabled: false });
      expect(res.status).toBe(403);
    }
    expect((await request(app).get('/api/config/features')).body).toEqual(ALL_ON);
  });

  it('rejette une valeur non booléenne, une clé inconnue ou un corps vide (400)', async () => {
    const app = buildApp();
    const send = (body: object) => request(app).put('/api/admin/config/features').set('x-test-role', 'admin').send(body);
    expect((await send({ restaurant_enabled: 'false' })).status).toBe(400);
    expect((await send({ spa_enabled: false })).status).toBe(400);
    expect((await send({})).status).toBe(400);
    expect((await request(app).get('/api/config/features')).body).toEqual(ALL_ON);
  });
});
