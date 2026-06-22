// Mock des dépendances lourdes (Cloudinary) pour tester le pur formatage du numéro.
jest.mock('./s3-client', () => ({ uploadToCloudinary: jest.fn(async () => ({ url: 'https://cdn/x.pdf' })) }));
jest.mock('../../config/cloudinary.config', () => ({ cloudinaryConfig: { folders: { invoices: 'invoices' } } }));

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
