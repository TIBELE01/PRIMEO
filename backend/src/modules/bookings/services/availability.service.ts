// Availability checker — verifies no date conflicts before booking confirmation
import { bookingRepository } from '../../../database/repositories/booking.repository';
import { prisma } from '../../../database/prisma.service';
import { HttpError } from '../../../common/handlers/http-error.handler';
import type { Prisma, PrismaClient } from '@prisma/client';

// Client Prisma global ou transactionnel (pour revérifier sous verrou)
type Db = PrismaClient | Prisma.TransactionClient;

export const availabilityService = {
  async checkDatesAvailable(propertyId: string, startDate: Date, endDate: Date, db: Db = prisma): Promise<void> {
    const overlapping = await bookingRepository.findOverlapping(propertyId, startDate, endDate, undefined, db);
    if (overlapping.length > 0) throw new HttpError(409, 'Ces dates ne sont plus disponibles');

    // Verify each date is marked available in the calendar
    const current = new Date(startDate);
    while (current < endDate) {
      const avail = await db.availability.findUnique({
        where: { propertyId_date: { propertyId, date: new Date(current) } },
      });
      if (avail && avail.status !== 'available') {
        throw new HttpError(409, `Date ${current.toISOString().split('T')[0]} is blocked`);
      }
      current.setDate(current.getDate() + 1);
    }
  },

  // Restaurants : plusieurs réservations de table par jour sont possibles.
  // On ne bloque pas la journée — on vérifie seulement que le total des couverts
  // déjà réservés ce jour-là, plus la nouvelle demande, ne dépasse pas la capacité.
  async checkRestaurantCapacity(
    propertyId: string,
    date: Date,
    requestedGuests: number,
    capacity: number | null,
    db: Db = prisma,
  ): Promise<void> {
    if (!capacity || capacity <= 0) return; // capacité non renseignée → pas de limite

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const sameDay = await db.booking.findMany({
      where: {
        propertyId,
        status: { in: ['confirmed', 'completed'] },
        startDate: { gte: dayStart, lt: dayEnd },
      },
      select: { guests: true },
    });

    const alreadyBooked = sameDay.reduce((sum, b) => sum + b.guests, 0);
    if (alreadyBooked + requestedGuests > capacity) {
      throw new HttpError(409, 'Plus assez de places disponibles pour ce créneau. Essayez un autre jour.');
    }
  },
};
