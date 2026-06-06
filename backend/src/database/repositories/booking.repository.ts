// Booking repository — DB operations for reservations
import { prisma } from '../prisma.service';
import { Prisma } from '@prisma/client';

export const bookingRepository = {
  findById: (id: string) =>
    prisma.booking.findUnique({
      where: { id },
      include: { client: true, property: true, transactions: true },
    }),

  findMany: (args?: Prisma.BookingFindManyArgs) =>
    prisma.booking.findMany(args),

  create: (data: Prisma.BookingCreateInput) =>
    prisma.booking.create({ data }),

  update: (id: string, data: Prisma.BookingUpdateInput) =>
    prisma.booking.update({ where: { id }, data }),

  count: (args?: Prisma.BookingCountArgs) =>
    prisma.booking.count(args),

  // Seules les réservations confirmées ou terminées bloquent les dates.
  // Les réservations en attente de paiement (pending_payment) ne doivent pas bloquer
  // pour éviter que des créneaux restent bloqués après un abandon de paiement.
  findOverlapping: (propertyId: string, startDate: Date, endDate: Date) =>
    prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['confirmed', 'completed'] },
        OR: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
        ],
      },
    }),
};
