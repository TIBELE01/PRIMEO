// Tests d'intégration HTTP des téléchargements signés (factures).
// Variables d'environnement minimales injectées AVANT l'import de l'app
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
import { createApp } from '../../app';
import { generateAndUploadBookingInvoice } from '../../common/utils/invoice';
import { createDownloadToken } from '../../common/utils/download-token';

const app = createApp();

function tokenFrom(url: string): string {
  return new URL(url).searchParams.get('t') ?? '';
}

describe('GET /api/downloads/invoice', () => {
  it('diffuse un PDF de facture valide pour un jeton correct', async () => {
    const url = await generateAndUploadBookingInvoice({
      invoiceNumber: 'ABCD1234', invoiceRef: 'FAC-2026-06-1234', invoiceDate: new Date(),
      customerName: 'Test Client', customerEmail: 't@x.com', propertyTitle: 'Resto Test',
      startDate: new Date(), endDate: new Date(), nights: 1,
      totalAmount: 15000, onlinePaidAmount: 0, remainingCashAmount: 15000,
    });

    const res = await request(app)
      .get('/api/downloads/invoice')
      .query({ t: tokenFrom(url) })
      .responseType('blob');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(res.body.length).toBeGreaterThan(800);
  });

  it('refuse un jeton expiré (410)', async () => {
    const expired = createDownloadToken({ k: 'binv', d: {} }, -1000);
    const res = await request(app).get('/api/downloads/invoice').query({ t: expired });
    expect(res.status).toBe(410);
  });

  it('refuse un jeton falsifié (401)', async () => {
    const res = await request(app).get('/api/downloads/invoice').query({ t: 'ZmFrZQ' });
    expect(res.status).toBe(401);
  });

  it('refuse un jeton absent (401)', async () => {
    const res = await request(app).get('/api/downloads/invoice');
    expect(res.status).toBe(401);
  });
});
