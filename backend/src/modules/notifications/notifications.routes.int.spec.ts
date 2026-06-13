// Test d'intégration (Supertest) des endpoints notifications — couvre le router
// et le controller avec un service mocké et une authentification simulée.
import express from 'express';
import request from 'supertest';

// Auth simulée : injecte req.user puis passe la main
jest.mock('../../common/middleware/jwt-auth.middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => { req.user = { sub: 'user-1', role: 'client' }; next(); },
}));
jest.mock('../../common/validators/parse-id.middleware', () => ({
  parseId: (_req: any, _res: any, next: any) => next(),
}));
jest.mock('./notifications.service', () => ({
  notificationsService: {
    listForUser: jest.fn(async () => ({ data: [{ id: 'n1' }], total: 1, unread: 1, page: 1, limit: 50, pages: 1 })),
    markRead: jest.fn(async () => undefined),
    markAllRead: jest.fn(async () => undefined),
    getPreferences: jest.fn(async () => ({ email: true, push: true, sms: false })),
    updatePreferences: jest.fn(async () => ({ email: true, push: false, sms: false })),
    registerPushToken: jest.fn(async () => undefined),
  },
}));

import { notificationsRouter } from './notifications.router';
import { notificationsService } from './notifications.service';

const app = express();
app.use(express.json());
app.use('/api/notifications', notificationsRouter);

describe('Endpoints /api/notifications', () => {
  beforeEach(() => jest.clearAllMocks());

  it('GET / — liste les notifications de l\'utilisateur', async () => {
    const res = await request(app).get('/api/notifications?page=1&limit=50');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1, unread: 1 });
    expect(notificationsService.listForUser).toHaveBeenCalledWith('user-1', 1, 50);
  });

  it('POST /:id/read — marque une notification lue', async () => {
    const res = await request(app).post('/api/notifications/n1/read');
    expect(res.status).toBe(200);
    expect(notificationsService.markRead).toHaveBeenCalledWith('n1', 'user-1');
  });

  it('POST /read-all — marque tout comme lu', async () => {
    const res = await request(app).post('/api/notifications/read-all');
    expect(res.status).toBe(200);
    expect(notificationsService.markAllRead).toHaveBeenCalledWith('user-1');
  });

  it('GET /preferences — renvoie les préférences', async () => {
    const res = await request(app).get('/api/notifications/preferences');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: true, push: true, sms: false });
  });

  it('PATCH /preferences — met à jour les préférences', async () => {
    const res = await request(app).patch('/api/notifications/preferences').send({ push: false });
    expect(res.status).toBe(200);
    expect(notificationsService.updatePreferences).toHaveBeenCalledWith('user-1', { push: false });
  });

  it('POST /push-token — enregistre le token push', async () => {
    const res = await request(app).post('/api/notifications/push-token').send({ token: 'ExponentPushToken[x]', platform: 'android' });
    expect(res.status).toBe(200);
    expect(notificationsService.registerPushToken).toHaveBeenCalledWith('user-1', 'ExponentPushToken[x]', 'android');
  });
});
