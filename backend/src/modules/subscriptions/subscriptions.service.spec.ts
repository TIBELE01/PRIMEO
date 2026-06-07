// Tests unitaires pour updatePlanBenefits — toutes les I/O externes sont mockées.
// Scénarios couverts : upgrade, downgrade avec suspension, payment_failure,
// réactivation, 404 sans abonnement, et bypass suspension (illimité = 9999).

// ── Mocks — déclarés avant tout import (hoisting Jest) ────────────────────────

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../common/utils/mailer', () => ({
  sendEmail: jest.fn(async () => undefined),
  sendTemplateEmail: jest.fn(async () => undefined),
}));

jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));

const mockPrisma = {
  subscription: {
    findUnique: jest.fn(),
    update: jest.fn(async (args: any) => ({ id: 'sub-1', ...args.data })),
  },
  user: {
    findUnique: jest.fn(),
  },
  property: {
    findMany: jest.fn(async () => []),
    updateMany: jest.fn(async () => ({ count: 0 })),
  },
  auditLog: {
    create: jest.fn(async () => ({})),
  },
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

jest.mock('../../config/supabase.config', () => ({
  supabaseAdmin: { auth: { admin: { deleteUser: jest.fn() } } },
}));

// Évite le process.exit de env.config lors du chargement du service
jest.mock('../../config/env.config', () => ({
  env: { BACKEND_URL: 'http://localhost:3000', FRONTEND_URL: '' },
}));

// Évite le chargement de env.config via genius-pay
jest.mock('../payments/services/genius-pay.service', () => ({
  geniusPayService: {
    initiatePayment:   jest.fn(async () => ({ checkoutUrl: 'http://pay.test', reference: 'ref-1' })),
    chargeRecurring:   jest.fn(async () => ({ success: true })),
  },
}));

// ── Imports après les mocks ──────────────────────────────────────────────────

import { updatePlanBenefits } from './subscriptions.service';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';

// ── Données de base partagées entre les tests ────────────────────────────────

/** Abonnement Starter actif minimal */
const SUB_STARTER = {
  id: 'sub-1',
  planType: 'starter',
  status: 'active',
  boostsFreeMonthly: 0,
  boostsFreeUsedThisMonth: 0,
  features: {},
};

/** Abonnement Business actif minimal */
const SUB_BUSINESS = {
  id: 'sub-1',
  planType: 'business',
  status: 'active',
  boostsFreeMonthly: 2,
  boostsFreeUsedThisMonth: 1,
  features: {},
};

/** Abonnement Entreprise actif minimal */
const SUB_ENTREPRISE = {
  id: 'sub-1',
  planType: 'entreprise',
  status: 'active',
  boostsFreeMonthly: 7,
  boostsFreeUsedThisMonth: 0,
  features: {},
};

beforeEach(() => {
  // Réinitialise tous les mocks entre chaque test pour éviter les interférences
  jest.clearAllMocks();
});

// ── Scénario 1 : upgrade Starter → Business ──────────────────────────────────

describe('updatePlanBenefits — upgrade starter → business', () => {
  it('met à jour le plan, remet les boosts à zéro et notifie subscription_upgraded', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_STARTER);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hotel' });

    const result = await updatePlanBenefits('user-1', 'business', 'upgrade');

    // Vérifier que l'abonnement est mis à jour avec les bonnes valeurs Business
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          planType: 'business',
          monthlyPrice: 9000,
          boostsFreeMonthly: 2,
          boostsFreeUsedThisMonth: 0, // réinitialisé lors d'un upgrade
        }),
      }),
    );

    // Aucune annonce ne doit être suspendue lors d'un upgrade
    expect(mockPrisma.property.findMany).not.toHaveBeenCalled();
    expect(result.suspendedProperties).toHaveLength(0);
    expect(result.previousPlan).toBe('starter');

    // La notification d'upgrade doit être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_upgraded' }),
    );

    // Le log d'audit doit être créé avec le bon contexte
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'subscription.upgrade',
          targetId: 'sub-1',
        }),
      }),
    );
  });
});

// ── Scénario 2 : downgrade Business → Starter avec 5 annonces (limite=3) ─────

describe('updatePlanBenefits — downgrade business → starter avec suspension', () => {
  it('suspend les 2 annonces excédentaires (p4, p5) et retourne suspendedProperties', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_BUSINESS);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hebergement' });

    // 5 annonces actives — la limite Starter pour hébergement est 3
    const cinqAnnonces = [
      { id: 'p1', title: 'A' },
      { id: 'p2', title: 'B' },
      { id: 'p3', title: 'C' },
      { id: 'p4', title: 'D' },
      { id: 'p5', title: 'E' },
    ];
    (mockPrisma.property.findMany as jest.Mock).mockResolvedValueOnce(cinqAnnonces);

    const result = await updatePlanBenefits('user-1', 'starter', 'downgrade');

    // Les 2 annonces en excès (p4, p5) doivent être suspendues
    expect(mockPrisma.property.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: ['p4', 'p5'] } }),
        data: expect.objectContaining({ status: 'suspended' }),
      }),
    );

    // Le résultat doit contenir exactement les 2 annonces suspendues
    expect(result.suspendedProperties).toEqual([
      { id: 'p4', title: 'D' },
      { id: 'p5', title: 'E' },
    ]);
    expect(result.previousPlan).toBe('business');

    // La notification de downgrade doit être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_downgraded' }),
    );
  });
});

// ── Scénario 3 : payment_failure → downgrade forcé vers Starter ──────────────

describe('updatePlanBenefits — payment_failure', () => {
  it('conserve le statut existant, marque suspendedFromPlan et notifie subscription_suspended', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_BUSINESS);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hotel' });
    // Aucune propriété excédentaire pour simplifier ce test
    mockPrisma.property.findMany.mockResolvedValueOnce([]);

    await updatePlanBenefits('user-1', 'starter', 'payment_failure');

    // Inspection de l'appel update
    const updateCall = mockPrisma.subscription.update.mock.calls[0][0];

    // Le statut ne doit PAS être forcé à 'active' — il reste celui du sub original
    // (sub.status était 'active', la logique payment_failure le conserve tel quel)
    expect(updateCall.data.status).toBe('active');

    // Le champ suspendedFromPlan doit être ajouté aux features
    expect(updateCall.data.features).toMatchObject({ suspendedFromPlan: 'business' });

    // La notification de suspension doit être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_suspended' }),
    );

    // Le log d'audit avec le contexte payment_failure doit être créé
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'subscription.payment_failure',
        }),
      }),
    );
  });
});

// ── Scénario 4 : réactivation — retour à Business après suspension ────────────

describe('updatePlanBenefits — reactivation', () => {
  it('repasse le statut à active, réactive les annonces suspendues et notifie subscription_reactivated', async () => {
    // Abonnement actuellement suspendu sur Starter, précédemment Business
    const subSuspendu = {
      id: 'sub-1',
      planType: 'starter',
      status: 'suspended',
      boostsFreeMonthly: 0,
      boostsFreeUsedThisMonth: 0,
      features: { suspendedFromPlan: 'business' },
    };
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(subSuspendu);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hotel' });

    await updatePlanBenefits('user-1', 'business', 'reactivation');

    // Le statut doit être remis à 'active' lors d'une réactivation
    const updateCall = mockPrisma.subscription.update.mock.calls[0][0];
    expect(updateCall.data.status).toBe('active');

    // Les annonces précédemment suspendues doivent être réactivées
    expect(mockPrisma.property.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ownerId: 'user-1', status: 'suspended' }),
        data: expect.objectContaining({ status: 'active' }),
      }),
    );

    // La notification de réactivation doit être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_reactivated' }),
    );
  });
});

// ── Scénario 5 : 404 si aucun abonnement en base ─────────────────────────────

describe('updatePlanBenefits — abonnement introuvable', () => {
  it('lève une HttpError 404 si subscription.findUnique retourne null', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(null);

    await expect(
      updatePlanBenefits('user-inconnu', 'business', 'upgrade'),
    ).rejects.toMatchObject({ statusCode: 404 });

    // Aucune mise à jour ne doit avoir lieu
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    expect(notificationsService.notify).not.toHaveBeenCalled();
  });
});

// ── Scénario 6 : restaurateur — limites selon type de compte ─────────────────

describe('updatePlanBenefits — restaurateur Entreprise (pubLimit=9999, bypass suspension)', () => {
  it('ne suspend aucun menu quand pubLimit=9999 (restaurateur Entreprise)', async () => {
    // Pour un restaurateur, getPublicationLimit('entreprise', 'restaurateur') = 9999
    // Le code court-circuite le check de suspension quand pubLimit >= 9999
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_BUSINESS);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'restaurateur' });

    await updatePlanBenefits('user-1', 'entreprise', 'downgrade');

    // property.findMany ne doit PAS être appelé car pubLimit = 9999 court-circuite
    expect(mockPrisma.property.findMany).not.toHaveBeenCalled();

    // Aucune annonce suspendue
    expect(mockPrisma.property.updateMany).not.toHaveBeenCalled();

    // La notification de downgrade doit quand même être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_downgraded' }),
    );
  });

  it('ne suspend aucun menu si le nombre actif (8) est inférieur à la limite (10) après downgrade', async () => {
    // Restaurateur business → downgrade vers une formule avec limit=10 menus
    // 8 menus actifs — aucune suspension attendue (8 < 10)
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_ENTREPRISE);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'restaurateur' });

    const huitMenus = Array.from({ length: 8 }, (_, i) => ({
      id: `m${i + 1}`,
      title: `Menu ${i + 1}`,
    }));
    (mockPrisma.property.findMany as jest.Mock).mockResolvedValueOnce(huitMenus);

    const result = await updatePlanBenefits('user-1', 'business', 'downgrade');

    // property.findMany est appelé (pubLimit=10 pour restaurateur business < 9999)
    expect(mockPrisma.property.findMany).toHaveBeenCalled();

    // Aucune suspension car 8 < 10
    expect(mockPrisma.property.updateMany).not.toHaveBeenCalled();
    expect(result.suspendedProperties).toHaveLength(0);

    // La notification de downgrade doit être envoyée
    expect(notificationsService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'subscription_downgraded' }),
    );
  });
});

// ── Scénario 7 : log d'audit — vérification fine du contenu et résilience ─────

describe('updatePlanBenefits — audit log', () => {
  it('écrit un log d\'audit avec description et métadonnées old/new', async () => {
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_STARTER);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hotel' });

    await updatePlanBenefits('user-1', 'business', 'upgrade');

    // Vérification du contenu détaillé du log d'audit
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        action: 'subscription.upgrade',
        targetType: 'subscription',
        targetId: 'sub-1',
        description: 'Formule starter → business [upgrade]',
        metadata: expect.objectContaining({
          old: { plan: 'starter' },
          new: expect.objectContaining({ plan: 'business' }),
        }),
      }),
    });
  });

  it('ne bloque pas le flux principal si auditLog.create rejette', async () => {
    // Si l'écriture du log échoue, la fonction doit quand même résoudre
    mockPrisma.subscription.findUnique.mockResolvedValueOnce(SUB_STARTER);
    mockPrisma.user.findUnique.mockResolvedValueOnce({ accountType: 'professional_hotel' });
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB indisponible'));

    // Le flux principal doit se terminer sans erreur (fire-and-forget)
    await expect(
      updatePlanBenefits('user-1', 'business', 'upgrade'),
    ).resolves.toBeDefined();

    // Laisser le microtask .catch() s'exécuter avant de vérifier
    await new Promise((r) => setTimeout(r, 10));

    // L'erreur doit être journalisée via logger.warn
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('audit error'),
      expect.any(Error),
    );
  });
});
