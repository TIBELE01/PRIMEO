// Tests unitaires — webhooksService.processGeniusPay (pipeline HMAC/timestamp/nonce + dispatch)

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({ env: { ONESIGNAL_WEBHOOK_SECRET: 'os-secret' } }));
jest.mock('../../config/genius-pay.config', () => ({ geniusPayConfig: { webhookSecret: 'whsec' } }));

const mockVerifyHmac = jest.fn();
const mockVerifyTs = jest.fn();
const mockCheckNonce = jest.fn();
jest.mock('../../common/utils/webhook-verifier', () => ({
  verifyHmacSignature: (...a: unknown[]) => mockVerifyHmac(...a),
  verifyTimestamp: (...a: unknown[]) => mockVerifyTs(...a),
  checkNonce: (...a: unknown[]) => mockCheckNonce(...a),
}));

const mockSuccess = jest.fn((..._a: unknown[]) => Promise.resolve(undefined));
const mockFailed = jest.fn((..._a: unknown[]) => Promise.resolve(undefined));
const mockRefunded = jest.fn((..._a: unknown[]) => Promise.resolve(undefined));
jest.mock('./handlers/genius-pay.handler', () => ({
  handlePaymentSuccess: (...a: unknown[]) => mockSuccess(...a),
  handlePaymentFailed: (...a: unknown[]) => mockFailed(...a),
  handlePaymentRefunded: (...a: unknown[]) => mockRefunded(...a),
}));
jest.mock('./handlers/onesignal.handler', () => ({ handleOneSignalEvent: jest.fn() }));

import { webhooksService } from './webhooks.service';

const raw = Buffer.from('{}');
function payload(extra: Record<string, unknown> = {}) {
  return { timestamp: Math.floor(Date.now() / 1000), nonce: 'n-1', ...extra };
}

describe('webhooksService.processGeniusPay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifyHmac.mockReturnValue(true);
    mockVerifyTs.mockReturnValue(true);
    mockCheckNonce.mockResolvedValue(true);
  });

  it('rejette une signature HMAC invalide (401)', async () => {
    mockVerifyHmac.mockReturnValue(false);
    await expect(webhooksService.processGeniusPay(payload({ event: 'payment.success' }), 'sig', raw, 'ip'))
      .rejects.toMatchObject({ statusCode: 401 });
    expect(mockSuccess).not.toHaveBeenCalled();
  });

  it('rejette un timestamp hors fenêtre (400)', async () => {
    mockVerifyTs.mockReturnValue(false);
    await expect(webhooksService.processGeniusPay(payload({ event: 'payment.success' }), 'sig', raw))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejette un nonce déjà vu — anti-rejeu (409)', async () => {
    mockCheckNonce.mockResolvedValue(false);
    await expect(webhooksService.processGeniusPay(payload({ event: 'payment.success' }), 'sig', raw))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('dispatche payment.success vers le bon handler', async () => {
    await webhooksService.processGeniusPay(payload({ event: 'payment.success', data: { reference: 'r' } }), 'sig', raw);
    expect(mockSuccess).toHaveBeenCalledTimes(1);
    expect(mockFailed).not.toHaveBeenCalled();
  });

  it('dispatche payment.failed et payment.refunded', async () => {
    await webhooksService.processGeniusPay(payload({ event: 'payment.failed', data: {} }), 'sig', raw);
    await webhooksService.processGeniusPay(payload({ event: 'payment.refunded', nonce: 'n-2', data: {} }), 'sig', raw);
    expect(mockFailed).toHaveBeenCalledTimes(1);
    expect(mockRefunded).toHaveBeenCalledTimes(1);
  });

  it('ignore un événement inconnu sans appeler de handler', async () => {
    await webhooksService.processGeniusPay(payload({ event: 'payment.unknown', data: {} }), 'sig', raw);
    expect(mockSuccess).not.toHaveBeenCalled();
    expect(mockFailed).not.toHaveBeenCalled();
    expect(mockRefunded).not.toHaveBeenCalled();
  });
});
