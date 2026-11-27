// Format officiel Genius Pay (pay.genius.ci/doc) : X-Webhook-Signature =
// HMAC-SHA256(X-Webhook-Timestamp + "." + payload JSON, secret) — vérification réelle (sans mock HMAC).
import crypto from 'crypto';

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({ env: {} }));
jest.mock('../../config/genius-pay.config', () => ({ geniusPayConfig: { webhookSecret: 'whsec_test' } }));
jest.mock('../../common/utils/redis-client', () => {
  const seen = new Set<string>();
  return {
    redisGet: jest.fn(async (k: string) => (seen.has(k) ? '1' : null)),
    redisSet: jest.fn(async (k: string) => { seen.add(k); }),
  };
});
const mockSuccess = jest.fn(async (..._a: unknown[]) => undefined);
const mockFailed = jest.fn(async (..._a: unknown[]) => undefined);
jest.mock('./handlers/genius-pay.handler', () => ({
  handlePaymentSuccess: (...a: unknown[]) => mockSuccess(...a),
  handlePaymentFailed: (...a: unknown[]) => mockFailed(...a),
  handlePaymentRefunded: jest.fn(),
}));
jest.mock('./handlers/onesignal.handler', () => ({ handleOneSignalEvent: jest.fn() }));

import { webhooksService } from './webhooks.service';

const sign = (data: string) => crypto.createHmac('sha256', 'whsec_test').update(data).digest('hex');

function officialDelivery(event: string, id: string) {
  const ts = String(Math.floor(Date.now() / 1000));
  const body = { id, event, timestamp: Number(ts), data: { reference: 'MTX-ABC', amount: '7000.00', status: 'completed', metadata: { booking_id: 'b1' } }, environment: 'live' };
  const raw = JSON.stringify(body);
  return { body, raw: Buffer.from(raw), ts, sig: sign(`${ts}.${raw}`) };
}

describe('Webhook Genius Pay — format officiel', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepte une signature HMAC(timestamp.payload) et confirme le paiement', async () => {
    const d = officialDelivery('payment.success', 'evt-1');
    await webhooksService.processGeniusPay(d.body, d.sig, d.raw, 'ip', { timestamp: d.ts, event: 'payment.success' });
    expect(mockSuccess).toHaveBeenCalledWith(expect.objectContaining({ reference: 'MTX-ABC' }));
  });

  it('refuse une signature calculée avec un autre secret (401)', async () => {
    const d = officialDelivery('payment.success', 'evt-2');
    const bad = crypto.createHmac('sha256', 'autre').update(`${d.ts}.${d.raw}`).digest('hex');
    await expect(webhooksService.processGeniusPay(d.body, bad, d.raw, 'ip', { timestamp: d.ts }))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('dédoublonne la même livraison (409)', async () => {
    const d = officialDelivery('payment.success', 'evt-3');
    await webhooksService.processGeniusPay(d.body, d.sig, d.raw, 'ip', { timestamp: d.ts });
    await expect(webhooksService.processGeniusPay(d.body, d.sig, d.raw, 'ip', { timestamp: d.ts }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('paiement expiré ou annulé → traité comme un échec', async () => {
    const d = officialDelivery('payment.expired', 'evt-4');
    await webhooksService.processGeniusPay(d.body, d.sig, d.raw, 'ip', { timestamp: d.ts });
    expect(mockFailed).toHaveBeenCalled();
  });

  it('webhook de test Genius Pay : accepté sans effet', async () => {
    const d = officialDelivery('webhook.test', 'evt-5');
    await expect(webhooksService.processGeniusPay(d.body, d.sig, d.raw, 'ip', { timestamp: d.ts })).resolves.toBeUndefined();
    expect(mockSuccess).not.toHaveBeenCalled();
  });
});
