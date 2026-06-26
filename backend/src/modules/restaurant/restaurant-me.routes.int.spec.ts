// Tests d'intégration HTTP : /api/restaurant/* résout l'ID du restaurant unique
// depuis l'utilisateur connecté (pas de :restaurantId dans l'URL).
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['DIRECT_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY'] = 'anon-key-test';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-key-test';
process.env['PUBLIC_URL'] = 'http://localhost:4000';
process.env['BACKEND_URL'] = 'http://localhost:4000';

// Auth simulée : injecte un compte restaurateur.
jest.mock('../../common/middleware/jwt-auth.middleware', () => ({
  ...jest.requireActual('../../common/middleware/jwt-auth.middleware'),
  authenticate: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    (req as { user: unknown }).user = { sub: 'owner-1', role: 'restaurateur' };
    next();
  },
}));

// Le restaurant unique du compte.
jest.mock('../properties/properties.service', () => ({
  propertiesService: { ensureRestaurant: jest.fn(async () => ({ id: 'resto-xyz', title: 'Mon Resto' })) },
}));

// Service restaurant mocké pour vérifier l'ID transmis.
jest.mock('./restaurant.service', () => ({
  restaurantService: {
    getMenuItems: jest.fn(async () => [{ id: 'm1' }]),
    getTables: jest.fn(async () => [{ id: 't1', name: 'Table 1', seats: 4 }]),
    getTimeSlots: jest.fn(async () => []),
  },
}));

import request from 'supertest';
import { createApp } from '../../app';
import { restaurantService } from './restaurant.service';

const app = createApp();

describe('/api/restaurant — ID auto-résolu depuis le compte', () => {
  it('GET /api/restaurant renvoie la fiche du restaurant du compte', async () => {
    const res = await request(app).get('/api/restaurant');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'resto-xyz' });
  });

  it('GET /api/restaurant/menu transmet l\'ID résolu au service', async () => {
    const res = await request(app).get('/api/restaurant/menu');
    expect(res.status).toBe(200);
    expect(restaurantService.getMenuItems).toHaveBeenCalledWith('resto-xyz');
  });

  it('GET /api/restaurant/tables transmet l\'ID résolu au service', async () => {
    const res = await request(app).get('/api/restaurant/tables');
    expect(res.status).toBe(200);
    expect(restaurantService.getTables).toHaveBeenCalledWith('resto-xyz');
  });
});
