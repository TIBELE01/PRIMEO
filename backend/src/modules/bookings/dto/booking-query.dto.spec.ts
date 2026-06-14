// Régression — ListBookingsQueryDto
//
// L'app mobile charge la liste des réservations avec limit=100. Auparavant le
// plafond était fixé à 50 : la requête GET /bookings/me?limit=100 était rejetée
// (400) et l'onglet « Réservations » restait vide. Ce test verrouille le
// nouveau plafond (100) et le comportement de validation.

import { ListBookingsQueryDto } from './booking.dto';

describe('ListBookingsQueryDto', () => {
  it('accepte limit=100 (chargement complet par l\'app mobile)', () => {
    const result = ListBookingsQueryDto.safeParse({ limit: 100, page: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
      expect(result.data.page).toBe(1);
    }
  });

  it('coerce les valeurs string des query params', () => {
    const result = ListBookingsQueryDto.safeParse({ limit: '100', page: '2' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(100);
      expect(result.data.page).toBe(2);
    }
  });

  it('applique les valeurs par défaut (page=1, limit=20)', () => {
    const result = ListBookingsQueryDto.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejette limit au-delà du plafond (101)', () => {
    const result = ListBookingsQueryDto.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('accepte un statut valide, dont interest_expressed (immobilier)', () => {
    for (const status of ['interest_expressed', 'pending_payment', 'confirmed', 'completed']) {
      const result = ListBookingsQueryDto.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it('rejette un statut inconnu', () => {
    const result = ListBookingsQueryDto.safeParse({ status: 'not_a_status' });
    expect(result.success).toBe(false);
  });
});
