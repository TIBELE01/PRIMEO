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

import { generateBookingInvoiceBuffer, generateSubscriptionInvoiceBuffer } from './invoice';

// Nombre de pages d'un PDF PDFKit (objets /Type /Page, hors /Pages)
const pageCount = (buf: Buffer) => (buf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) ?? []).length;

describe('facture PDF — une seule page', () => {
  const base = {
    invoiceNumber: 'CMWQTX12', invoiceRef: 'FAC-2026-11-2JSA', invoiceDate: new Date('2026-11-21'),
    customerName: 'Yao Invité', customerEmail: 'client@exemple.ci', propertyTitle: 'Studio Design Marcory Zone 4',
    startDate: new Date('2027-03-31'), endDate: new Date('2027-04-02'), nights: 2,
  };

  it.each([
    ['100 % sur place', { totalAmount: 70000, onlinePaidAmount: 0, remainingCashAmount: 70000 }],
    ['acompte 10 % + portefeuille', { totalAmount: 65000, onlinePaidAmount: 6500, remainingCashAmount: 58500, walletDeduction: 5000 }],
    ['100 % en ligne', { totalAmount: 70000, onlinePaidAmount: 70000, remainingCashAmount: 0 }],
    ['ancien lien signé (sans champs d’affichage) + titre très long', { totalAmount: 0, onlinePaidAmount: 0, remainingCashAmount: 0, propertyTitle: 'R'.repeat(300), sectionLabel: 'Réservation' }],
  ])('%s', async (_n, extra) => {
    const pdf = await generateBookingInvoiceBuffer({ ...base, ...extra });
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(1);
  });

  it('facture d’abonnement', async () => {
    const pdf = await generateSubscriptionInvoiceBuffer({
      invoiceNumber: 'SUB-1', invoiceDate: new Date(), periodStart: new Date(), periodEnd: new Date(),
      customerName: 'Koffi', customerEmail: 'pro@exemple.ci', planName: 'Entreprise', amount: 25000, isPaid: true,
    });
    expect(pageCount(pdf)).toBe(1);
  });
});
