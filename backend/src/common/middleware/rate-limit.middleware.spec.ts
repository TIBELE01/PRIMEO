// Tests d'intégration — rate limiting : repli en mémoire sans Redis + clé par IP fiable

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/redis.config', () => ({
  redisConfig: { authLimitWindow: 900, authLimitMax: 5, globalLimitWindow: 60, globalLimitMax: 300 },
}));

const mockGetRedisClient = jest.fn();
jest.mock('../utils/redis-client', () => ({
  getRedisClient: () => mockGetRedisClient(),
}));

import express from 'express';
import request from 'supertest';
import { rateLimit } from 'express-rate-limit';
import { UpstashRedisStore, authRateLimit, applyRateLimit } from './rate-limit.middleware';

function buildLimitedApp(prefix: string, max = 3) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(
    rateLimit({
      windowMs: 60_000,
      max,
      store: new UpstashRedisStore(60_000, prefix),
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  app.get('/', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('UpstashRedisStore — repli en mémoire', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedisClient.mockReturnValue(null); // Redis non configuré
  });

  it('applique réellement la limite quand Redis n\'est pas configuré', async () => {
    const app = buildLimitedApp('t1:');
    const statuses: number[] = [];
    for (let i = 0; i < 5; i++) {
      statuses.push((await request(app).get('/')).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429, 429]);
  });

  it('applique la limite quand Redis est configuré mais en panne', async () => {
    mockGetRedisClient.mockReturnValue({
      incr: jest.fn(async () => { throw new Error('redis down'); }),
    });
    const app = buildLimitedApp('t2:');
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      statuses.push((await request(app).get('/')).status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });

  it('compte séparément deux clients distincts', async () => {
    const app = buildLimitedApp('t3:', 1);
    expect((await request(app).get('/').set('X-Forwarded-For', '203.0.113.1')).status).toBe(200);
    expect((await request(app).get('/').set('X-Forwarded-For', '203.0.113.2')).status).toBe(200);
    expect((await request(app).get('/').set('X-Forwarded-For', '203.0.113.1')).status).toBe(429);
  });

  it('utilise le compteur Redis quand il répond', async () => {
    let n = 0;
    mockGetRedisClient.mockReturnValue({
      incr: jest.fn(async () => ++n),
      expire: jest.fn(async () => 1),
      ttl: jest.fn(async () => 60),
    });
    const app = buildLimitedApp('t4:', 2);
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(429);
  });
});

describe('authRateLimit — clé par IP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetRedisClient.mockReturnValue(null);
  });

  function buildAuthApp() {
    const app = express();
    app.set('trust proxy', 1);
    // Échec systématique : seuls les échecs sont comptés (skipSuccessfulRequests)
    app.post('/login', authRateLimit, (_req, res) => res.status(401).json({ error: 'bad credentials' }));
    return app;
  }

  it('ne se contourne pas en falsifiant le début de X-Forwarded-For', async () => {
    // Derrière un proxy de confiance, l'IP réelle est le DERNIER élément (ajouté
    // par le proxy) ; le client ne maîtrise que ce qui précède.
    const app = buildAuthApp();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/login')
        .set('X-Forwarded-For', `10.0.0.${i}, 198.51.100.7`); // préfixe falsifié différent à chaque essai
      statuses.push(res.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429]);
  });

  it('ne pénalise pas un autre client', async () => {
    const app = buildAuthApp();
    for (let i = 0; i < 6; i++) {
      await request(app).post('/login').set('X-Forwarded-For', '198.51.100.20');
    }
    const other = await request(app).post('/login').set('X-Forwarded-For', '198.51.100.21');
    expect(other.status).toBe(401);
  });
});

describe('limite globale — 300 requêtes / minute / IP', () => {
  beforeEach(() => mockGetRedisClient.mockReturnValue(null));

  it('accepte 300 requêtes de la même IP, refuse la 301e, sans toucher aux autres IP ni à /api/health', async () => {
    const app = express();
    app.set('trust proxy', 1);
    applyRateLimit(app);
    app.get('/api/x', (_req, res) => res.json({ ok: true }));
    app.get('/api/health', (_req, res) => res.json({ ok: true }));

    for (let i = 0; i < 300; i++) {
      const r = await request(app).get('/api/x').set('X-Forwarded-For', '203.0.113.50');
      expect(r.status).toBe(200);
    }
    const blocked = await request(app).get('/api/x').set('X-Forwarded-For', '203.0.113.50');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toMatch(/Trop de requêtes/);
    expect(blocked.headers['ratelimit-limit']).toBe('300');

    const other = await request(app).get('/api/x').set('X-Forwarded-For', '203.0.113.51');
    expect(other.status).toBe(200);
    const health = await request(app).get('/api/health').set('X-Forwarded-For', '203.0.113.50');
    expect(health.status).toBe(200);
  });
});
