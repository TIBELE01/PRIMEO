// Tests unitaires — geniusPayService (client API REST). axios et config mockés.

jest.mock('../../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../config/env.config', () => ({
  env: { BACKEND_URL: 'https://api.test', FRONTEND_URL: 'https://app.test' },
}));

jest.mock('../../../config/genius-pay.config', () => ({
  geniusPayConfig: {
    apiKey: 'pk_test',
    secretKey: 'sk_test',
    webhookSecret: 'whsec',
    baseUrl: 'https://pay.test/api/v1/merchant',
    currency: 'XOF',
  },
}));

const mockPost = jest.fn();
const mockGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { post: (...a: unknown[]) => mockPost(...a), get: (...a: unknown[]) => mockGet(...a) },
}));

import { geniusPayService } from './genius-pay.service';

const initParams = {
  amount: 100,
  bookingId: 'bk-1',
  customerEmail: 'c@test.ci',
  customerPhone: '+2250700000000',
  customerName: 'Test Client',
  returnUrl: 'https://app.test/return',
};

describe('geniusPayService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('initiatePayment', () => {
    it('envoie les bons en-têtes X-API-Key/X-API-Secret et renvoie checkoutUrl + reference', async () => {
      mockPost.mockResolvedValue({ data: { data: { checkout_url: 'https://pay.test/co/abc', reference: 'ref-1' } } });

      const res = await geniusPayService.initiatePayment(initParams);

      expect(res).toEqual({ checkoutUrl: 'https://pay.test/co/abc', reference: 'ref-1' });
      const [, body, config] = mockPost.mock.calls[0];
      expect((config as { headers: Record<string, string> }).headers['X-API-Key']).toBe('pk_test');
      expect((config as { headers: Record<string, string> }).headers['X-API-Secret']).toBe('sk_test');
      // webhook URL doit pointer vers /api/webhooks/genius-pay
      expect((body as { callback_url: string }).callback_url).toBe('https://api.test/api/webhooks/genius-pay');
    });

    it('normalise les noms de champ alternatifs (payment_url, transaction_id)', async () => {
      mockPost.mockResolvedValue({ data: { payment_url: 'https://pay.test/x', transaction_id: 'tx-9' } });
      const res = await geniusPayService.initiatePayment(initParams);
      expect(res).toEqual({ checkoutUrl: 'https://pay.test/x', reference: 'tx-9' });
    });

    it('rejette si le téléphone client est absent', async () => {
      await expect(geniusPayService.initiatePayment({ ...initParams, customerPhone: undefined }))
        .rejects.toThrow(/téléphone/i);
      expect(mockPost).not.toHaveBeenCalled();
    });

    it("rejette si la réponse ne contient aucune URL de checkout", async () => {
      mockPost.mockResolvedValue({ data: { data: { reference: 'ref-only' } } });
      await expect(geniusPayService.initiatePayment(initParams)).rejects.toThrow(/URL de paiement manquante/i);
    });
  });

  describe('getPaymentStatus', () => {
    it('renvoie le statut et le montant normalisés', async () => {
      mockGet.mockResolvedValue({ data: { data: { status: 'success', amount: 100 } } });
      const res = await geniusPayService.getPaymentStatus('ref-1');
      expect(res).toEqual({ status: 'success', amount: 100 });
    });
  });

  describe('refundPayment', () => {
    it('appelle l\'endpoint refund avec auth + payload corrects', async () => {
      mockPost.mockResolvedValue({ data: { data: { reference: 'rfnd-1' } } });
      const res = await geniusPayService.refundPayment({ originalReference: 'ref-1', amount: 50, reason: 'test' });
      expect(res).toEqual({ reference: 'rfnd-1' });
      const [url, body, config] = mockPost.mock.calls[0];
      expect(url).toContain('/payments/ref-1/refund');
      expect((body as { amount: number }).amount).toBe(50);
      expect((config as { headers: Record<string, string> }).headers['X-API-Key']).toBe('pk_test');
    });
  });

  describe('chargeRecurring', () => {
    it('retourne success=true quand le statut est success', async () => {
      mockPost.mockResolvedValue({ data: { data: { status: 'success', reference: 'r-1' } } });
      const res = await geniusPayService.chargeRecurring({
        subscriptionId: 's-1', amount: 9000, customerEmail: 'c@test.ci', description: 'Abo',
      });
      expect(res.success).toBe(true);
    });

    it('retourne success=false et l\'erreur quand l\'appel échoue', async () => {
      mockPost.mockRejectedValue(new Error('network down'));
      const res = await geniusPayService.chargeRecurring({
        subscriptionId: 's-1', amount: 9000, customerEmail: 'c@test.ci', description: 'Abo',
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/network down/);
    });
  });
});
