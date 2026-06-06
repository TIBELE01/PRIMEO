// Factory réservations — données cohérentes pour les tests
import type { PrismaClient, Booking } from '@prisma/client';
import { BookingStatus, PaymentOption } from '@prisma/client';

let _seq = 1;
function seq(): number {
  return _seq++;
}

function dateOnly(d: Date): Date {
  return new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z');
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return dateOnly(d);
}

function daysAgo(n: number): Date {
  return daysFromNow(-n);
}

// ─── Build factory (pas de DB) ────────────────────────────────────────────────

type BuildBookingInput = Partial<Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>>;

export function buildBooking(overrides: BuildBookingInput = {}): Omit<Booking, 'id' | 'createdAt' | 'updatedAt'> {
  const n = seq();
  const nights = 3;
  const pricePerNight = 60000;
  const total = nights * pricePerNight;

  return {
    clientId: `client-id-${n}`,
    propertyId: `property-id-${n}`,
    startDate: daysFromNow(10),
    endDate: daysFromNow(13),
    guests: 2,
    totalAmount: total,
    onlinePaidAmount: total,
    paymentOption: PaymentOption.full_online,
    commissionAmount: Math.round(total * 0.05),
    remainingCashAmount: 0,
    status: BookingStatus.confirmed,
    specialRequests: null,
    cancellationReason: null,
    cancelledBy: null,
    confirmedAt: new Date(),
    cancelledAt: null,
    ...overrides,
  };
}

// ─── Variantes par statut ─────────────────────────────────────────────────────

export function buildCompletedBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 60000;
  return buildBooking({
    startDate: daysAgo(15),
    endDate: daysAgo(12),
    totalAmount: total,
    onlinePaidAmount: total,
    paymentOption: PaymentOption.full_online,
    commissionAmount: Math.round(total * 0.05),
    remainingCashAmount: 0,
    status: BookingStatus.completed,
    confirmedAt: daysAgo(20),
    ...overrides,
  });
}

export function buildConfirmedBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 55000;
  const deposit = Math.round(total * 0.1);
  return buildBooking({
    startDate: daysFromNow(5),
    endDate: daysFromNow(8),
    totalAmount: total,
    onlinePaidAmount: deposit,
    paymentOption: PaymentOption.ten_percent_online,
    commissionAmount: 0,
    remainingCashAmount: total - deposit,
    status: BookingStatus.confirmed,
    confirmedAt: daysAgo(1),
    ...overrides,
  });
}

export function buildPendingBooking(overrides: BuildBookingInput = {}) {
  const total = 2 * 40000;
  return buildBooking({
    startDate: daysFromNow(20),
    endDate: daysFromNow(22),
    totalAmount: total,
    onlinePaidAmount: 0,
    paymentOption: PaymentOption.zero_online,
    commissionAmount: Math.round(total * 0.05),
    remainingCashAmount: total,
    status: BookingStatus.pending_payment,
    confirmedAt: null,
    ...overrides,
  });
}

export function buildCancelledByClientBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 85000;
  return buildBooking({
    startDate: daysAgo(10),
    endDate: daysAgo(7),
    totalAmount: total,
    onlinePaidAmount: total,
    paymentOption: PaymentOption.full_online,
    commissionAmount: Math.round(total * 0.05),
    remainingCashAmount: 0,
    status: BookingStatus.cancelled_by_client,
    confirmedAt: daysAgo(15),
    cancelledAt: daysAgo(12),
    cancelledBy: 'client',
    cancellationReason: 'Changement de programme.',
    ...overrides,
  });
}

export function buildCancelledByProfessionalBooking(overrides: BuildBookingInput = {}) {
  const total = 2 * 55000;
  const deposit = Math.round(total * 0.1);
  return buildBooking({
    startDate: daysAgo(5),
    endDate: daysAgo(3),
    totalAmount: total,
    onlinePaidAmount: deposit,
    paymentOption: PaymentOption.ten_percent_online,
    commissionAmount: 0,
    remainingCashAmount: total - deposit,
    status: BookingStatus.cancelled_by_professional,
    confirmedAt: daysAgo(8),
    cancelledAt: daysAgo(6),
    cancelledBy: 'professional',
    cancellationReason: 'Travaux imprévus.',
    ...overrides,
  });
}

// ─── Variantes par option de paiement ────────────────────────────────────────

export function buildFullOnlineBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 60000;
  return buildBooking({
    totalAmount: total,
    onlinePaidAmount: total,
    paymentOption: PaymentOption.full_online,
    remainingCashAmount: 0,
    ...overrides,
  });
}

export function buildTenPercentBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 60000;
  const deposit = Math.round(total * 0.1);
  return buildBooking({
    totalAmount: total,
    onlinePaidAmount: deposit,
    paymentOption: PaymentOption.ten_percent_online,
    remainingCashAmount: total - deposit,
    ...overrides,
  });
}

export function buildZeroOnlineBooking(overrides: BuildBookingInput = {}) {
  const total = 3 * 60000;
  return buildBooking({
    totalAmount: total,
    onlinePaidAmount: 0,
    paymentOption: PaymentOption.zero_online,
    remainingCashAmount: total,
    status: BookingStatus.pending_payment,
    confirmedAt: null,
    ...overrides,
  });
}

// ─── Prisma factory (avec DB) ─────────────────────────────────────────────────

type CreateBookingInput = BuildBookingInput & { id?: string };

export async function createBooking(
  prisma: PrismaClient,
  overrides: CreateBookingInput = {},
): Promise<Booking> {
  const { id, ...data } = overrides;
  return prisma.booking.create({
    data: {
      id: id ?? undefined,
      ...buildBooking(data),
    },
  });
}

export async function createCompletedBooking(
  prisma: PrismaClient,
  clientId: string,
  propertyId: string,
  overrides: CreateBookingInput = {},
): Promise<Booking> {
  const { id, ...data } = overrides;
  return prisma.booking.create({
    data: { id: id ?? undefined, ...buildCompletedBooking({ clientId, propertyId, ...data }) },
  });
}

export async function createPendingBooking(
  prisma: PrismaClient,
  clientId: string,
  propertyId: string,
  overrides: CreateBookingInput = {},
): Promise<Booking> {
  const { id, ...data } = overrides;
  return prisma.booking.create({
    data: { id: id ?? undefined, ...buildPendingBooking({ clientId, propertyId, ...data }) },
  });
}
