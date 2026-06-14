// Task 62 — Limite de publications : réactivation d'une annonce archivée + duplication
//
// Vérifie que :
//   - publish() refuse de réactiver une annonce archivée si la limite est atteinte
//     (403 explicite proposant l'achat d'un slot / montée en formule)
//   - publish() autorise la réactivation quand un slot est disponible
//   - duplicate() applique la même limite
//   - réactiver une annonce suspendue (déjà comptée) ne déclenche PAS la vérif

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:3000' },
  cloudinaryParsed: { cloudName: 'test', apiKey: 'k', apiSecret: 's' },
}));

jest.mock('../../common/utils/maps', () => ({
  geocodeAddress: jest.fn().mockResolvedValue(null),
}));

jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn().mockResolvedValue(undefined) },
}));

const mockPrisma = {
  property: { findUnique: jest.fn(), count: jest.fn(), update: jest.fn(), create: jest.fn() },
  subscription: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

import { propertiesService } from './properties.service';

const OWNER_ID = 'pro-1';

const archivedProperty = {
  id: 'prop-archived',
  ownerId: OWNER_ID,
  status: 'archived',
  title: 'Studio archivé',
  propertyType: 'hebergement',
};

describe('Task 62 — réactivation soumise à la limite de publications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Business = 10 publications, aucun slot supplémentaire
    mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', extraPublicationSlots: 0 });
    mockPrisma.user.findUnique.mockResolvedValue({ accountType: 'professional_hebergement' });
    mockPrisma.property.update.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...archivedProperty, ...data }),
    );
  });

  // ── publish() depuis archived ────────────────────────────────────────────────

  describe('publish() — réactivation d\'une annonce archivée', () => {
    it('refuse avec 403 explicite si la limite est atteinte', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(archivedProperty);
      mockPrisma.property.count.mockResolvedValue(10); // 10/10 slots occupés

      await expect(propertiesService.publish('prop-archived', OWNER_ID)).rejects.toMatchObject({
        statusCode: 403,
      });
      // Le message propose une solution (achat de slot / montée en formule)
      await expect(propertiesService.publish('prop-archived', OWNER_ID)).rejects.toThrow(/supplémentaires|formule supérieure/);
      // L'annonce reste archivée
      expect(mockPrisma.property.update).not.toHaveBeenCalled();
    });

    it('autorise la réactivation quand un slot est libre', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(archivedProperty);
      mockPrisma.property.count.mockResolvedValue(9); // 9/10 → 1 slot libre

      const result = await propertiesService.publish('prop-archived', OWNER_ID);
      expect(mockPrisma.property.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'pending' } }),
      );
      expect(result.status).toBe('pending');
    });

    it('prend en compte les slots supplémentaires achetés', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({ planType: 'business', extraPublicationSlots: 3 });
      mockPrisma.property.findUnique.mockResolvedValue(archivedProperty);
      mockPrisma.property.count.mockResolvedValue(10); // 10 < 13 (10 + 3) → autorisé

      await expect(propertiesService.publish('prop-archived', OWNER_ID)).resolves.toMatchObject({
        status: 'pending',
      });
    });
  });

  // ── publish() depuis suspended (déjà compté) ────────────────────────────────

  describe('publish() — réactivation d\'une annonce suspendue', () => {
    it('ne déclenche PAS la vérification de limite (slot déjà occupé)', async () => {
      mockPrisma.property.findUnique.mockResolvedValue({ ...archivedProperty, status: 'suspended' });
      // count renverrait 10 mais ne doit pas être consulté pour un statut déjà compté
      mockPrisma.property.count.mockResolvedValue(10);

      const result = await propertiesService.publish('prop-archived', OWNER_ID);
      expect(result.status).toBe('pending');
      expect(mockPrisma.property.count).not.toHaveBeenCalled();
    });
  });

  // ── Statut non réactivable ──────────────────────────────────────────────────

  it('refuse 400 si l\'annonce est déjà active', async () => {
    mockPrisma.property.findUnique.mockResolvedValue({ ...archivedProperty, status: 'active' });
    await expect(propertiesService.publish('prop-archived', OWNER_ID)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  // ── duplicate() ─────────────────────────────────────────────────────────────

  describe('duplicate() — applique la limite', () => {
    const source = {
      id: 'prop-src',
      ownerId: OWNER_ID,
      status: 'active',
      title: 'Villa',
      propertyType: 'hebergement',
      media: [],
      scenes3d: [],
    };

    it('refuse avec 403 si la limite est atteinte', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(source);
      mockPrisma.property.count.mockResolvedValue(10);

      await expect(propertiesService.duplicate('prop-src', OWNER_ID)).rejects.toMatchObject({
        statusCode: 403,
      });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('autorise la duplication quand un slot est libre', async () => {
      mockPrisma.property.findUnique.mockResolvedValue(source);
      mockPrisma.property.count.mockResolvedValue(5);
      mockPrisma.$transaction.mockResolvedValue({ id: 'prop-copy', status: 'draft' });

      const copy = await propertiesService.duplicate('prop-src', OWNER_ID);
      expect(copy).toMatchObject({ id: 'prop-copy' });
    });
  });
});
