import { redactSecrets } from './logger';

describe('redactSecrets — aucune clé de prestataire dans les journaux', () => {
  it('erreur axios : en-têtes et clés retirés, requête résumée', () => {
    const err: any = {
      message: 'Request failed with status code 409',
      config: { method: 'post', url: 'https://pay.genius.ci/api/v1/merchant/payments/MTX-1/refund?x=1',
        headers: { 'X-API-Key': 'pk_live_abc123', 'X-API-Secret': 'sk_live_def456' }, data: '{"amount":2500}' },
      request: { socket: {} },
      response: { status: 409, data: { success: false } },
    };
    err.request.self = err.request; // référence circulaire comme dans axios
    const out = JSON.stringify(redactSecrets(err));
    expect(out).not.toMatch(/sk_live_def456|pk_live_abc123/);
    expect(out).toContain('"status":409');
    expect(out).toContain('https://pay.genius.ci/api/v1/merchant/payments/MTX-1/refund');
  });
  it('valeurs sensibles masquées même dans un texte libre', () => {
    const out = redactSecrets({ note: 'clé sk_live_ff2f02aa et secret whsec_vEuXYZ', password: 'x', authorization: 'Bearer abc' });
    expect(JSON.stringify(out)).not.toMatch(/sk_live_ff2f02aa|whsec_vEuXYZ/);
    expect((out as any).password).toBe('[MASQUÉ]');
  });
});
