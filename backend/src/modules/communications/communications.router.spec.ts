// Routes admin « Communication » : accès réservé au Super Admin, validation des corps.

jest.mock('../../common/utils/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
jest.mock('../../common/utils/mailer', () => ({ sendEmail: jest.fn() }));
jest.mock('../notifications/providers/push.provider', () => ({ pushProvider: { sendToUser: jest.fn() } }));

let adminRole: string | null = 'super_admin';
let accountType = 'admin';
jest.mock('../../database/prisma.service', () => ({
  prisma: { user: { findUnique: jest.fn(async () => ({ accountType, adminRole })) } },
}));

const mockCreate = jest.fn();
jest.mock('./communications.service', () => ({
  MAX_RECIPIENTS_PER_CAMPAIGN: 500,
  communicationsService: {
    getStatus: () => ({ configured: true }),
    createCampaign: (...a: unknown[]) => mockCreate(...a),
    listCampaigns: jest.fn(async () => ({ data: [], total: 0, page: 1, limit: 20, pages: 0 })),
    getCampaign: jest.fn(async () => ({ id: 'c1' })),
    listOptOuts: jest.fn(async () => []),
    addOptOut: jest.fn(async () => ({ id: 'o1' })),
    removeOptOut: jest.fn(async () => undefined),
  },
}));

import express, { Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { communicationsRouter } from './communications.router';
import { handleHttpError } from '../../common/handlers/http-error.handler';

function app() {
  const a = express();
  a.use(express.json());
  a.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.headers['x-user']) { res.status(401).json({ error: 'auth' }); return; }
    req.user = { sub: 'adm-1', email: 'a@t.ci', role: 'admin' as never };
    next();
  });
  a.use('/api/admin/communications', communicationsRouter);
  a.use(handleHttpError);
  return a;
}
const valid = { channel: 'whatsapp', recipients: [{ to: '2250700000001' }], text: 'Bonjour', consentConfirmed: true };

beforeEach(() => { jest.clearAllMocks(); adminRole = 'super_admin'; accountType = 'admin'; mockCreate.mockResolvedValue({ id: 'c1', status: 'completed' }); });

describe('accès', () => {
  it('Super Admin : autorisé', async () => {
    expect((await request(app()).get('/api/admin/communications/status').set('x-user', '1')).status).toBe(200);
  });
  it('rôle admin différent (modérateur, support, analyste) : 403', async () => {
    for (const role of ['moderateur', 'support', 'analyste']) {
      adminRole = role;
      const res = await request(app()).post('/api/admin/communications/send').set('x-user', '1').send(valid);
      expect(res.status).toBe(403);
    }
    expect(mockCreate).not.toHaveBeenCalled();
  });
  it('rôle admin non renseigné = super admin (comportement existant)', async () => {
    adminRole = null;
    expect((await request(app()).get('/api/admin/communications/status').set('x-user', '1')).status).toBe(200);
  });
  it('compte non admin : 403 ; non authentifié : 401', async () => {
    accountType = 'client';
    expect((await request(app()).get('/api/admin/communications/status').set('x-user', '1')).status).toBe(403);
    expect((await request(app()).get('/api/admin/communications/status')).status).toBe(401);
  });
});

describe('envois', () => {
  it('POST /send → mode direct, 201 ; POST /broadcast → mode broadcast', async () => {
    const a = app();
    expect((await request(a).post('/api/admin/communications/send').set('x-user', '1').send(valid)).status).toBe(201);
    expect(mockCreate).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'direct', channel: 'whatsapp' }), 'adm-1');
    await request(a).post('/api/admin/communications/broadcast').set('x-user', '1').send(valid);
    expect(mockCreate).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'broadcast' }), 'adm-1');
  });
  it('campagne encore en cours → 202', async () => {
    mockCreate.mockResolvedValue({ id: 'c1', status: 'processing' });
    expect((await request(app()).post('/api/admin/communications/broadcast').set('x-user', '1').send(valid)).status).toBe(202);
  });
  it('rejette un corps invalide (400) : canal inconnu, consentement absent ou non booléen, champ inconnu, aucun destinataire', async () => {
    const a = app();
    const post = (body: object) => request(a).post('/api/admin/communications/broadcast').set('x-user', '1').send(body);
    expect((await post({ ...valid, channel: 'sms' })).status).toBe(400);
    expect((await post({ ...valid, consentConfirmed: undefined })).status).toBe(400);
    expect((await post({ ...valid, consentConfirmed: 'true' })).status).toBe(400);
    expect((await post({ ...valid, extra: 1 })).status).toBe(400);
    expect((await post({ ...valid, recipients: [] })).status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('historique et désinscriptions', () => {
  it('liste, détail, désinscriptions', async () => {
    const a = app();
    expect((await request(a).get('/api/admin/communications/campaigns?channel=telegram&page=2').set('x-user', '1')).status).toBe(200);
    expect((await request(a).get('/api/admin/communications/campaigns?channel=sms').set('x-user', '1')).status).toBe(400);
    expect((await request(a).get('/api/admin/communications/campaigns/c1').set('x-user', '1')).status).toBe(200);
    expect((await request(a).post('/api/admin/communications/opt-outs').set('x-user', '1').send({ channel: 'whatsapp', recipient: '2250700000001' })).status).toBe(201);
    expect((await request(a).delete('/api/admin/communications/opt-outs/o1').set('x-user', '1')).status).toBe(204);
  });
});
