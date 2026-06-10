// Smoke test d'intégration — vérifie que l'application démarre et répond sur /api/health.
// Les variables d'environnement minimales sont injectées AVANT tout import de l'app
// (env.config valide ces variables et ferait process.exit sinon).

process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['DIRECT_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY'] = 'anon-key-test';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-key-test';
process.env['PUBLIC_URL'] = 'http://localhost:4000';
process.env['BACKEND_URL'] = 'http://localhost:4000';

import request from 'supertest';
import { createApp } from '../app';

describe('Smoke test — démarrage de l\'API', () => {
  const app = createApp();

  it('GET /api/health renvoie 200 avec un statut ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET / renvoie 200 (racine de santé)', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/route-inexistante renvoie une erreur (pas un crash)', async () => {
    const res = await request(app).get('/api/cette-route-nexiste-pas');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
