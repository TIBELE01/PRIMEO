// Booking factory — generates test booking objects for seeding and unit tests
import type { Prisma } from '@prisma/client';

export function buildBooking(
  clientId: string,
  propertyId: string,
  overrides: Partial<Prisma.BookingCreateInput> = {}
): Prisma.BookingCreateInput {
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 7);
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3);

  return {
    client: { connect: { id: clientId } },
    property: { connect: { id: propertyId } },
    checkIn,
    checkOut,
    guestCount: 2,
    totalPrice: 150_000,
    depositAmount: 0,
    paymentOption: 'full_online',
    status: 'pending',
    ...overrides,
  };
}
