// Client ratings service — professionals rate clients after completed stays
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { CreateClientRatingInput } from './dto/client-rating.dto';

// ── helpers ────────────────────────────────────────────────────────────────────

function computeOverallRating(
  respect: number,
  communication: number,
  punctuality: number,
  rules: number,
): number {
  return Math.round((respect + communication + punctuality + rules) / 4);
}

// ── service ────────────────────────────────────────────────────────────────────

export const clientRatingsService = {
  // ── Create (professional → client) ─────────────────────────────────────────

  async create(raterId: string, input: CreateClientRatingInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: {
        property: { select: { ownerId: true } },
        client: { select: { id: true } },
      },
    });

    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.property.ownerId !== raterId) {
      throw new HttpError(403, 'Seul le professionnel lié à cette réservation peut noter le client');
    }
    if (booking.status !== 'completed') {
      throw new HttpError(400, 'Vous ne pouvez noter le client qu\'après la fin effective du séjour');
    }

    // Guard: endDate must be in the past (date comparison)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(booking.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate >= today) {
      throw new HttpError(400, 'Le séjour n\'est pas encore terminé');
    }

    const existing = await prisma.clientRating.findUnique({ where: { bookingId: input.bookingId } });
    if (existing) throw new HttpError(409, 'Vous avez déjà noté ce client pour cette réservation');

    const overallRating = computeOverallRating(
      input.respectRating,
      input.communicationRating,
      input.punctualityRating,
      input.rulesRating,
    );

    return prisma.clientRating.create({
      data: {
        bookingId: input.bookingId,
        ratedUserId: booking.client.id,
        raterUserId: raterId,
        respectRating: input.respectRating,
        communicationRating: input.communicationRating,
        punctualityRating: input.punctualityRating,
        rulesRating: input.rulesRating,
        overallRating,
        comment: input.comment,
        isPublic: input.isPublic,
      },
      include: {
        ratedUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  },

  // ── List ratings given by a professional ────────────────────────────────────

  async listGiven(raterId: string, query: { page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = Math.min(parseInt(query.limit ?? '20'), 50);

    const [data, total] = await Promise.all([
      prisma.clientRating.findMany({
        where: { raterUserId: raterId },
        include: {
          ratedUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          booking: { select: { id: true, startDate: true, endDate: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.clientRating.count({ where: { raterUserId: raterId } }),
    ]);

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  },

  // ── Client aggregate (professionals only — never the client themselves) ──────

  async getClientAggregate(clientId: string) {
    // Only non-hidden ratings count toward the aggregate
    const ratings = await prisma.clientRating.findMany({
      where: { ratedUserId: clientId, isHidden: false },
      select: {
        id: true,
        overallRating: true,
        respectRating: true,
        communicationRating: true,
        punctualityRating: true,
        rulesRating: true,
        comment: true,
        isPublic: true,
        createdAt: true,
        raterUser: { select: { firstName: true, lastName: true } },
      },
    });

    if (ratings.length === 0) {
      return {
        clientId,
        totalRatings: 0,
        overallAvg: 0,
        avgRespect: 0,
        avgCommunication: 0,
        avgPunctuality: 0,
        avgRules: 0,
        publicComments: [],
      };
    }

    const avg = (field: keyof typeof ratings[0]) =>
      parseFloat(
        (ratings.reduce((s, r) => s + (r[field] as number), 0) / ratings.length).toFixed(2),
      );

    return {
      clientId,
      totalRatings: ratings.length,
      overallAvg: avg('overallRating'),
      avgRespect: avg('respectRating'),
      avgCommunication: avg('communicationRating'),
      avgPunctuality: avg('punctualityRating'),
      avgRules: avg('rulesRating'),
      // Only expose public comments
      publicComments: ratings
        .filter((r) => r.isPublic && r.comment)
        .map((r) => ({
          comment: r.comment,
          raterName: `${r.raterUser.firstName} ${r.raterUser.lastName}`,
          createdAt: r.createdAt,
        })),
    };
  },

  // ── Check if professional can rate a client for a booking ────────────────────

  async canRate(raterId: string, bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        endDate: true,
        property: { select: { ownerId: true } },
        clientRating: { select: { id: true } },
      },
    });

    if (!booking) return { canRate: false, alreadyRated: false, reason: 'Réservation introuvable' };
    if (booking.property.ownerId !== raterId) return { canRate: false, alreadyRated: false, reason: 'Non autorisé' };
    if (booking.status !== 'completed') return { canRate: false, alreadyRated: false, reason: 'Séjour non terminé' };
    if (booking.clientRating) return { canRate: false, alreadyRated: true, reason: 'Client déjà noté pour cette réservation' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(booking.endDate);
    endDate.setHours(0, 0, 0, 0);
    if (endDate >= today) return { canRate: false, alreadyRated: false, reason: 'Le séjour n\'est pas encore terminé' };

    return { canRate: true, alreadyRated: false, reason: null };
  },

  // ── List ratings RECEIVED by the authenticated client (score hidden) ─────────

  async listReceived(clientId: string, query: { page?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = 20;

    const [data, total] = await Promise.all([
      prisma.clientRating.findMany({
        where: { ratedUserId: clientId },
        select: {
          id: true,
          bookingId: true,
          isPublic: true,
          isReported: true,
          isHidden: true,
          createdAt: true,
          // expose comment only if public
          comment: true,
          raterUser: { select: { firstName: true, lastName: true } },
          booking: {
            select: {
              startDate: true,
              endDate: true,
              property: { select: { id: true, title: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.clientRating.count({ where: { ratedUserId: clientId } }),
    ]);

    // Strip private comments before returning to the client
    const sanitized = data.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      isReported: r.isReported,
      isHidden: r.isHidden,
      createdAt: r.createdAt,
      raterName: `${r.raterUser.firstName} ${r.raterUser.lastName[0]}.`,
      comment: r.isPublic ? (r.comment ?? null) : null,
      propertyTitle: r.booking?.property?.title ?? null,
      stayPeriod: r.booking
        ? `${new Date(r.booking.startDate).toLocaleDateString('fr-FR')} – ${new Date(r.booking.endDate).toLocaleDateString('fr-FR')}`
        : null,
    }));

    return { data: sanitized, total, page, limit, pages: Math.ceil(total / limit) };
  },



  async reportRating(ratingId: string, clientId: string, reason: string) {
    const rating = await prisma.clientRating.findUnique({ where: { id: ratingId } });
    if (!rating) throw new HttpError(404, 'Évaluation introuvable');
    if (rating.ratedUserId !== clientId) {
      throw new HttpError(403, 'Vous ne pouvez signaler qu\'une évaluation qui vous concerne');
    }
    if (rating.isReported) throw new HttpError(409, 'Cette évaluation a déjà été signalée');

    await prisma.clientRating.update({
      where: { id: ratingId },
      data: { isReported: true, reportReason: reason },
    });
  },
};
