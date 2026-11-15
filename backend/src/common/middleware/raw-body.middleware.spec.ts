// Tests d'intégration — chaîne réelle raw-body → express.json → handler webhook.
// Verrouille la régression « stream is not readable » (tous les webhooks JSON en 500).
import express, { Request, Response } from 'express';
import request from 'supertest';
import { applyRawBody } from './raw-body.middleware';

function buildApp() {
  const app = express();
  // Même ordre que dans app.ts : corps brut des webhooks, puis JSON global.
  applyRawBody(app);
  app.use(express.json({ limit: '10mb' }));
  const echo = (req: Request, res: Response) => {
    res.json({ body: req.body, raw: req.rawBody ? req.rawBody.toString('utf8') : null });
  };
  app.post('/api/webhooks/genius-pay', echo);
  app.post('/api/other', echo);
  return app;
}

describe('applyRawBody', () => {
  it('laisse passer un webhook JSON et expose le corps brut exact + le corps décodé', async () => {
    const payload = '{"event":"payment.success",  "data":{"reference":"r-1"}}';
    const res = await request(buildApp())
      .post('/api/webhooks/genius-pay')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);
    // Le brut doit être identique octet pour octet (espaces compris) : c'est la base du HMAC.
    expect(res.body.raw).toBe(payload);
    expect(res.body.body).toEqual({ event: 'payment.success', data: { reference: 'r-1' } });
  });

  it('décode aussi un corps JSON envoyé avec un autre Content-Type', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/genius-pay')
      .set('Content-Type', 'text/plain')
      .send('{"a":1}');

    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ a: 1 });
  });

  it('accepte un webhook sans corps', async () => {
    const res = await request(buildApp()).post('/api/webhooks/genius-pay');
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({});
    expect(res.body.raw).toBe('');
  });

  it('répond 400 sur un JSON invalide', async () => {
    const res = await request(buildApp())
      .post('/api/webhooks/genius-pay')
      .set('Content-Type', 'application/json')
      .send('{pas du json');
    expect(res.status).toBe(400);
  });

  it('refuse un corps au-delà de la limite (413)', async () => {
    const big = JSON.stringify({ blob: 'x'.repeat(1024 * 1024 + 10) });
    const res = await request(buildApp())
      .post('/api/webhooks/genius-pay')
      .set('Content-Type', 'application/json')
      .send(big);
    expect(res.status).toBe(413);
  });

  it('ne touche pas aux routes hors webhooks', async () => {
    const res = await request(buildApp()).post('/api/other').send({ x: 1 });
    expect(res.status).toBe(200);
    expect(res.body.body).toEqual({ x: 1 });
    expect(res.body.raw).toBeNull();
  });
});
