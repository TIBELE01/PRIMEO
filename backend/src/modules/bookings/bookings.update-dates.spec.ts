// Tests unitaires — bookingsService.updateDates
// Couvre : succès, double modification successive, accès non autorisé,
// statut invalide, types de propriété exclus, chevauchement, blocages calendrier.

// ── Mocks (tous les imports du service) ───────────────────────────────────────

jest.mock('../../common/utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('../../config/env.config', () => ({
  env: { FRONTEND_URL: 'http://app.test', BACKEND_URL: 'http://localhost:4000' },
}));
jest.mock('../notifications/notifications.service', () => ({
  notificationsService: { notify: jest.fn(async () => undefined) },
}));
jest.mock('../messaging/messaging.service', () => ({
  messagingService: { saveMessage: jest.fn(async () => ({})), saveAutoBookingMessage: jest.fn(async () => ({ id: 'msg-auto' })) },
}));
jest.mock('../referrals/referrals.service', () => ({
  referralsService: { triggerReward: jest.fn(async () => undefined) },
}));
jest.mock('../wallets/wallets.service', () => ({
  walletService: { getBalance: jest.fn(async () => 0), debit: jest.fn(), credit: jest.fn() },
}));
jest.mock('./services/availability.service', () => ({
  availabilityService: { checkDatesAvailable: jest.fn(), checkRestaurantCapacity: jest.fn() },
}));
jest.mock('./services/pricing.service', () => ({
  pricingService: { compute: jest.fn() },
}));
jest.mock('./services/cancellation.service', () => ({
  cancellationService: { computeRefund: jest.fn() },
}));
jest.mock('../payments/services/genius-pay.service', () => ({
  geniusPayService: { initiatePayment: jest.fn() },
}));
jest.mock('../webhooks/handlers/genius-pay.handler', () => ({
  processSuccessfulPayment: jest.fn(),
  processFailedPayment: jest.fn(),
  ensureBookingInvoice: jest.fn(async () => null),
}));

// bookingRepository.findOverlapping est utilisé par updateDates
const mockFindOverlapping = jest.fn();
jest.mock('../../database/repositories/booking.repository', () => ({
  bookingRepository: { findOverlapping: (...args: unknown[]) => mockFindOverlapping(...args) },
}));

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockAvailabilityFindUnique = jest.fn();
const mockAvailabilityDeleteMany = jest.fn(async () => ({ count: 0 }));
const mockAvailabilityUpsert = jest.fn(async () => ({}));
const mockBookingFindUnique = jest.fn();

const mockTx = {
  booking: { update: jest.fn(async () => ({})) },
  availability: {
    deleteMany: mockAvailabilityDeleteMany,
    upsert: mockAvailabilityUpsert,
  },
};

const mockPrisma = {
  booking: { findUnique: mockBookingFindUnique },
  availability: { findUnique: mockAvailabilityFindUnique },
  $transaction: jest.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
};
jest.mock('../../database/prisma.service', () => ({ prisma: mockPrisma }));

// ── Import ────────────────────────────────────────────────────────────────────

import { bookingsService } from './bookings.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const CLIENT_ID = 'client-1';
const BOOKING_ID = 'booking-abc';
const PROPERTY_ID = 'prop-1';
const OWNER_ID = 'owner-1';

function makeConfirmedBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: BOOKING_ID,
    clientId: CLIENT_ID,
    propertyId: PROPERTY_ID,
    startDate: new Date('2026-08-01'),
    endDate: new Date('2026-08-05'),
    status: 'confirmed',
    property: { ownerId: OWNER_ID, propertyType: 'residence', title: 'Villa Sunset' },
    ...overrides,
  };
}

const FUTURE_START = '2026-09-10';
const FUTURE_END   = '2026-09-15';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('bookingsService.updateDates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindOverlapping.mockResolvedValue([]);           // pas de chevauchement
    mockAvailabilityFindUnique.mockResolvedValue(null);  // dates libres dans le calendrier
    mockBookingFindUnique
      .mockResolvedValueOnce(makeConfirmedBooking())     // première lecture (chargement)
      .mockResolvedValue({ id: BOOKING_ID, startDate: new Date(FUTURE_START), endDate: new Date(FUTURE_END) }); // après update
  });

  it('met à jour les dates et retourne le booking actualisé', async () => {
    const result = await bookingsService.updateDates(BOOKING_ID, CLIENT_ID, {
      startDate: FUTURE_START,
      endDate: FUTURE_END,
    });

    expect(result.message).toBe('Dates mises à jour');
    expect(result.booking).toBeDefined();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockAvailabilityUpsert).toHaveBeenCalled();
    expect(mockAvailabilityDeleteMany).toHaveBeenCalled();
  });

  it('retourne « Dates inchangées » si les dates sont identiques', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(
      makeConfirmedBooking({ startDate: new Date('2026-09-10'), endDate: new Date('2026-09-15') }),
    );

    const result = await bookingsService.updateDates(BOOKING_ID, CLIENT_ID, {
      startDate: '2026-09-10',
      endDate: '2026-09-15',
    });

    expect(result.message).toBe('Dates inchangées');
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('permet deux modifications successives sans erreur', async () => {
    // Première modification : août → septembre
    const result1 = await bookingsService.updateDates(BOOKING_ID, CLIENT_ID, {
      startDate: '2026-09-01',
      endDate: '2026-09-05',
    });
    expect(result1.message).toBe('Dates mises à jour');

    // Prépare le mock pour la deuxième modification (booking avec nouvelles dates)
    mockBookingFindUnique
      .mockResolvedValueOnce(makeConfirmedBooking({ startDate: new Date('2026-09-01'), endDate: new Date('2026-09-05') }))
      .mockResolvedValue({ id: BOOKING_ID });

    const result2 = await bookingsService.updateDates(BOOKING_ID, CLIENT_ID, {
      startDate: '2026-10-01',
      endDate: '2026-10-07',
    });
    expect(result2.message).toBe('Dates mises à jour');
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2);
  });

  it('lève 404 quand la réservation est introuvable', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(null);

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lève 403 si l\'utilisateur n\'est pas le client de la réservation', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(makeConfirmedBooking({ clientId: 'other-client' }));

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('lève 400 si la réservation n\'est pas confirmée (pending_payment)', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(makeConfirmedBooking({ status: 'pending_payment' }));

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 400 pour une propriété de type restaurant', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(
      makeConfirmedBooking({ property: { ownerId: OWNER_ID, propertyType: 'restaurant', title: 'Le Grill' } }),
    );

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 400 pour une propriété immobilier', async () => {
    mockBookingFindUnique.mockReset();
    mockBookingFindUnique.mockResolvedValueOnce(
      makeConfirmedBooking({ property: { ownerId: OWNER_ID, propertyType: 'immobilier_location', title: 'Appart Marcory' } }),
    );

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève 409 quand les nouvelles dates chevauchent une autre réservation confirmée', async () => {
    mockFindOverlapping.mockResolvedValue([{ id: 'other-booking' }]);

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('lève 409 quand une date dans la plage est bloquée manuellement', async () => {
    mockAvailabilityFindUnique.mockResolvedValueOnce({ status: 'manually_blocked' });

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('lève 409 quand une date est bloquée par un calendrier externe (iCal)', async () => {
    mockAvailabilityFindUnique.mockResolvedValueOnce({ status: 'external_blocked' });

    await expect(
      bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('passe findOverlapping avec l\'ID de la réservation courante en exclusion', async () => {
    await bookingsService.updateDates(BOOKING_ID, CLIENT_ID, { startDate: FUTURE_START, endDate: FUTURE_END });

    expect(mockFindOverlapping).toHaveBeenCalledWith(
      PROPERTY_ID,
      new Date(FUTURE_START),
      new Date(FUTURE_END),
      BOOKING_ID,
    );
  });
});
