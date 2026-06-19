// Task 54 — Test d'intégration : expression d'intérêt immobilier
//
// Simule un client qui exprime son intérêt pour un bien immobilier.
// Vérifie :
//   1. Réservation créée avec status 'interest_expressed'
//   2. totalAmount = onlinePaidAmount = 0 (aucun paiement)
//   3. Conversation ouverte automatiquement (messagingService.saveMessage appelé)
//   4. Professionnel notifié (interest_booking_received)
//   5. Client notifié (interest_submitted)
//   6. Genius Pay n'est JAMAIS contacté

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), debug: jest.fn(), error: jest.fn() },
}));

jest.mock('../config/env.config', () => ({
  env: {
    FRONTEND_URL: 'https://app.test',
    GENIUS_PAY_API_URL: 'https://sandbox.genius.ci/api/v1/merchant',
    SKIP_OTP_VERIFICATION: 'true',
  },
}));

const mockNotify = jest.fn().mockResolvedValue(undefined);
jest.mock('../modules/notifications/notifications.service', () => ({
  notificationsService: { notify: (...a: unknown[]) => mockNotify(...a) },
}));

const mockSaveMessage = jest.fn().mockResolvedValue(undefined);
const mockSaveAuto = jest.fn().mockResolvedValue(undefined);
jest.mock('../modules/messaging/messaging.service', () => ({
  messagingService: {
    saveMessage: (...a: unknown[]) => mockSaveMessage(...a),
    saveAutoBookingMessage: (...a: unknown[]) => mockSaveAuto(...a),
  },
}));

jest.mock('../modules/referrals/referrals.service', () => ({
  referralsService: {
    processBookingReferral: jest.fn().mockResolvedValue(undefined),
    triggerReward: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../modules/wallets/wallets.service', () => ({
  walletService: {
    getBalance: jest.fn().mockResolvedValue(0),
    debit: jest.fn().mockResolvedValue(undefined),
    getOrCreate: jest.fn().mockResolvedValue({ balance: 0, currency: 'XOF' }),
  },
}));

jest.mock('../modules/bookings/services/availability.service', () => ({
  availabilityService: {
    checkDatesAvailable: jest.fn().mockResolvedValue(undefined),
  },
}));

// Genius Pay doit rester silencieux — tout appel provoque une erreur de test
const mockGeniusInitiate = jest.fn().mockRejectedValue(new Error('Genius Pay should NOT be called for interest bookings'));
jest.mock('../modules/payments/services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: (...a: unknown[]) => mockGeniusInitiate(...a) },
}));

jest.mock('../modules/webhooks/handlers/genius-pay.handler', () => ({
  processSuccessfulPayment: jest.fn(),
  processFailedPayment: jest.fn(),
  ensureBookingInvoice: jest.fn(),
}));

const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
  property: { findUnique: jest.fn() },
  booking: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  promoCode: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};
jest.mock('../database/prisma.service', () => ({ prisma: mockPrisma }));

// ── Imports après mocks ───────────────────────────────────────────────────────

import { bookingsService } from '../modules/bookings/bookings.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLIENT_ID = 'client-001';
const PRO_ID    = 'pro-001';
const PROP_ID   = 'prop-immo-001';

const client = {
  id: CLIENT_ID,
  email: 'acheteur@test.ci',
  phone: '+2250700100200',
  firstName: 'Fatou',
  lastName: 'Bamba',
  accountType: 'client',
};

const immobilierProperty = {
  id: PROP_ID,
  ownerId: PRO_ID,
  title: 'Villa 5 pièces — Cocody Riviera',
  propertyType: 'immobilier_vente', // déclenche le flow interest_expressed
  status: 'active',
  capacity: null,
  paymentOptions: [],
  pricePerNight: null,
  pricePerMonth: null,
  priceSale: 45_000_000,
  owner: { subscription: { planType: 'business', commissionRate: null } },
};

const interestBooking = {
  id: 'booking-interest-001',
  clientId: CLIENT_ID,
  propertyId: PROP_ID,
  status: 'interest_expressed',
  totalAmount: 0,
  onlinePaidAmount: 0,
  remainingCashAmount: 0,
  commissionAmount: 0,
  paymentOption: 'zero_online',
  confirmedAt: new Date(),
  specialRequests: null,
};

const bookingInput = {
  propertyId: PROP_ID,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 86_400_000).toISOString(),
  guests: 2,
  paymentOption: 'zero_online' as const,
  interestMessage: 'Bonjour, je suis très intéressé par ce bien. Suis-je bien à temps ?',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Intérêt immobilier — parcours complet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(client);
    mockPrisma.user.update.mockResolvedValue(client);
    mockPrisma.property.findUnique.mockResolvedValue(immobilierProperty);
    mockPrisma.booking.create.mockResolvedValue(interestBooking);
  });

  // ── Statut & montants ────────────────────────────────────────────────────────

  describe('Réservation créée', () => {
    it('le statut est "interest_expressed"', async () => {
      const result = await bookingsService.create(CLIENT_ID, bookingInput as never);
      const booking = 'booking' in result ? result.booking : result;
      expect(booking.status).toBe('interest_expressed');
    });

    it('tous les montants sont à zéro (aucun paiement demandé)', async () => {
      const result = await bookingsService.create(CLIENT_ID, bookingInput as never);
      const booking = 'booking' in result ? result.booking : result;
      expect(booking.totalAmount).toBe(0);
      expect(booking.onlinePaidAmount).toBe(0);
      expect(booking.remainingCashAmount).toBe(0);
      expect(booking.commissionAmount).toBe(0);
    });

    it('le pricing renvoyé reflète l\'absence de paiement', async () => {
      const result = await bookingsService.create(CLIENT_ID, bookingInput as never);
      if ('pricing' in result) {
        expect(result.pricing.totalAmount).toBe(0);
        expect(result.pricing.onlinePaidAmount).toBe(0);
      }
    });

    it('la réservation est associée au bon client et à la bonne propriété', async () => {
      mockPrisma.booking.create.mockResolvedValue({ ...interestBooking, clientId: CLIENT_ID, propertyId: PROP_ID });
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clientId: CLIENT_ID,
            propertyId: PROP_ID,
            status: 'interest_expressed',
          }),
        }),
      );
    });
  });

  // ── Messagerie automatique ────────────────────────────────────────────────────

  describe('Conversation ouverte automatiquement', () => {
    it('saveAutoBookingMessage est appelé pour ouvrir la discussion', async () => {
      // Le message structuré est envoyé en background (void) — on attend les timers async
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      // Laisser les promesses background se résoudre
      await new Promise(r => setImmediate(r));
      expect(mockSaveAuto).toHaveBeenCalledTimes(1);
      expect(mockSaveAuto).toHaveBeenCalledWith(interestBooking.id);
    });

    it('le message d\'intérêt fourni par le client est persisté (specialRequests) pour alimenter le message auto', async () => {
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      await new Promise(r => setImmediate(r));
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ specialRequests: bookingInput.interestMessage }),
        }),
      );
    });

    it('aucun interestMessage → specialRequests null (message par défaut généré côté serveur)', async () => {
      await bookingsService.create(CLIENT_ID, { ...bookingInput, interestMessage: undefined } as never);
      await new Promise(r => setImmediate(r));
      expect(mockPrisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ specialRequests: null }),
        }),
      );
      expect(mockSaveAuto).toHaveBeenCalledWith(interestBooking.id);
    });
  });

  // ── Notifications ─────────────────────────────────────────────────────────────

  describe('Notifications', () => {
    it('le professionnel reçoit une notification interest_booking_received', async () => {
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      await new Promise(r => setImmediate(r));
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'interest_booking_received',
          recipientId: PRO_ID,
        }),
      );
    });

    it('le client reçoit une notification interest_submitted', async () => {
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      await new Promise(r => setImmediate(r));
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'interest_submitted',
          recipientId: CLIENT_ID,
        }),
      );
    });

    it('la notification contient le titre du bien et le nom du client', async () => {
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      await new Promise(r => setImmediate(r));
      expect(mockNotify).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            propertyTitle: immobilierProperty.title,
            senderName: `${client.firstName} ${client.lastName}`,
          }),
        }),
      );
    });
  });

  // ── Genius Pay non contacté ───────────────────────────────────────────────────

  describe('Aucun paiement en ligne', () => {
    it('Genius Pay n\'est jamais appelé pour une expression d\'intérêt', async () => {
      await bookingsService.create(CLIENT_ID, bookingInput as never);
      await new Promise(r => setImmediate(r));
      expect(mockGeniusInitiate).not.toHaveBeenCalled();
    });

    it('le flow s\'applique à tous les types de biens immobiliers', async () => {
      for (const type of ['immobilier_vente', 'immobilier_location', 'immobilier_autre']) {
        jest.clearAllMocks();
        mockPrisma.user.findUnique.mockResolvedValue(client);
        mockPrisma.property.findUnique.mockResolvedValue({ ...immobilierProperty, propertyType: type });
        mockPrisma.booking.create.mockResolvedValue(interestBooking);

        const result = await bookingsService.create(CLIENT_ID, bookingInput as never);
        const booking = 'booking' in result ? result.booking : result;

        expect(booking.status).toBe('interest_expressed');
        expect(mockGeniusInitiate).not.toHaveBeenCalled();
      }
    });
  });
});
