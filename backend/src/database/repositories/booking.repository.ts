// Booking repository — DB operations for reservations
import { prisma } from '../prisma.service';
import { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

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
  // pour éviter que des créneaux restent bloqués après un abandon de paiement ;
  // le conflit éventuel est tranché au moment de la confirmation (voir
  // lockPropertyCalendar + processSuccessfulPayment).
  // excludeBookingId : utilisé lors d'une modification de dates pour ne pas rejeter
  // la réservation en cours elle-même.
  // Bornes [arrivée, départ[ : le jour de départ d'un séjour peut être le jour
  // d'arrivée du suivant (comparaisons strictes).
  findOverlapping: (
    propertyId: string,
    startDate: Date,
    endDate: Date,
    excludeBookingId?: string,
    db: Db = prisma,
  ) =>
    db.booking.findMany({
      where: {
        propertyId,
        status: { in: ['confirmed', 'completed'] },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        startDate: { lt: endDate },
        endDate: { gt: startDate },
      },
    }),

  // Verrou par propriété, tenu jusqu'à la fin de la transaction en cours.
  // Toute opération qui vérifie la disponibilité PUIS confirme une réservation
  // doit le prendre d'abord : deux confirmations simultanées sur la même
  // propriété s'exécutent alors l'une après l'autre, et la seconde voit la première.
  lockPropertyCalendar: async (propertyId: string, db: Prisma.TransactionClient): Promise<void> => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${propertyId}))`;
  },
};
