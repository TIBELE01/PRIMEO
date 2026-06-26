// Variables d'environnement minimales injectées AVANT l'import (invoice.ts charge
// env.config — qui ferait process.exit — et le chiffrement des jetons de téléchargement).
process.env['NODE_ENV'] = 'test';
process.env['DATABASE_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['DIRECT_URL'] = 'postgresql://u:p@localhost:5432/test?schema=public';
process.env['SUPABASE_URL'] = 'https://test.supabase.co';
process.env['SUPABASE_ANON_KEY'] = 'anon-key-test';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-key-test';
process.env['PUBLIC_URL'] = 'http://localhost:4000';
process.env['BACKEND_URL'] = 'http://localhost:4000';

import { formatBookingInvoiceRef } from './invoice';

describe('formatBookingInvoiceRef', () => {
  it('produit le format FAC-YYYY-MM-XXXX', () => {
    const ref = formatBookingInvoiceRef(new Date('2026-06-15T10:00:00Z'), 'cmabcd1234');
    expect(ref).toBe('FAC-2026-06-1234');
  });

  it('zéro-pad le mois (< 10)', () => {
    expect(formatBookingInvoiceRef(new Date('2026-01-03T00:00:00Z'), 'xxxxAB7Z')).toBe('FAC-2026-01-AB7Z');
  });

  it('est déterministe (même réservation → même numéro)', () => {
    const d = new Date('2026-06-20T08:00:00Z');
    expect(formatBookingInvoiceRef(d, 'booking-XYZ9')).toBe(formatBookingInvoiceRef(d, 'booking-XYZ9'));
  });

  it('ignore les caractères non alphanumériques de l\'identifiant', () => {
    expect(formatBookingInvoiceRef(new Date('2026-06-01T00:00:00Z'), 'a-b-c-d-e9F2')).toBe('FAC-2026-06-E9F2');
  });

  it('retombe sur 0000 si l\'identifiant est vide', () => {
    expect(formatBookingInvoiceRef(new Date('2026-06-01T00:00:00Z'), '')).toBe('FAC-2026-06-0000');
  });
});
