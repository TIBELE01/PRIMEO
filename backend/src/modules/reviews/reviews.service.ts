// Reviews service — multi-criteria ratings, 7-day edit/delete window, professional replies
import { prisma } from '../../database/prisma.service';
import { HttpError } from '../../common/handlers/http-error.handler';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../common/utils/logger';
import { CreateReviewInput, UpdateReviewInput } from './dto/review.dto';

const EDIT_WINDOW_DAYS = 7;

async function recalculatePropertyRating(propertyId: string): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { propertyId, status: 'published' },
    _avg: { rating: true },
    _count: true,
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      rating: agg._avg.rating ?? 0,
      reviewCount: agg._count,
    },
  });
}

export const reviewsService = {
  async create(authorId: string, input: CreateReviewInput) {
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { property: { select: { id: true, ownerId: true, title: true } } },
    });
    if (!booking) throw new HttpError(404, 'Réservation introuvable');
    if (booking.clientId !== authorId) throw new HttpError(403, 'Vous n\'êtes pas l\'auteur de cette réservation');
    if (booking.status !== 'completed') throw new HttpError(400, 'Vous ne pouvez noter qu\'une réservation terminée');

    const existing = await prisma.review.findUnique({ where: { bookingId: input.bookingId } });
    if (existing) throw new HttpError(409, 'Vous avez déjà soumis un avis pour cette réservation');

    const now = new Date();
    const review = await prisma.review.create({
      data: {
        bookingId: input.bookingId,
        propertyId: booking.propertyId,
        authorId,
        rating: input.rating,
        cleanlinessRating: input.cleanlinessRating,
        communicationRating: input.communicationRating,
        accuracyRating: input.accuracyRating,
        locationRating: input.locationRating,
        valueRating: input.valueRating,
        cuisineRating: input.cuisineRating,
        serviceRating: input.serviceRating,
        ambianceRating: input.ambianceRating,
        comment: input.comment,
        status: 'published',
        publishedAt: now,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await recalculatePropertyRating(booking.propertyId);

    notificationsService.notify({
      type: 'review_received',
      recipientId: booking.property.ownerId,
      data: {
        propertyTitle: booking.property.title,
        rating: input.rating,
        senderName: review.author.firstName + ' ' + review.author.lastName,
      },
    }).catch((err) => logger.warn('Notify review_received failed', err));

    return review;
  },

  async update(reviewId: string, authorId: string, input: UpdateReviewInput) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new HttpError(404, 'Avis introuvable');
    if (review.authorId !== authorId) throw new HttpError(403, 'Vous n\'êtes pas l\'auteur de cet avis');

    const cutoff = new Date(review.createdAt.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      throw new HttpError(400, 'La fenêtre de modification de 7 jours est écoulée');
    }

    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(input.rating !== undefined && { rating: input.rating }),
        ...(input.cleanlinessRating !== undefined && { cleanlinessRating: input.cleanlinessRating }),
        ...(input.communicationRating !== undefined && { communicationRating: input.communicationRating }),
        ...(input.accuracyRating !== undefined && { accuracyRating: input.accuracyRating }),
        ...(input.locationRating !== undefined && { locationRating: input.locationRating }),
        ...(input.valueRating !== undefined && { valueRating: input.valueRating }),
        ...(input.cuisineRating !== undefined && { cuisineRating: input.cuisineRating }),
        ...(input.serviceRating !== undefined && { serviceRating: input.serviceRating }),
        ...(input.ambianceRating !== undefined && { ambianceRating: input.ambianceRating }),
        ...(input.comment !== undefined && { comment: input.comment }),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    await recalculatePropertyRating(review.propertyId);
    return updated;
  },

  async delete(reviewId: string, authorId: string) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new HttpError(404, 'Avis introuvable');
    if (review.authorId !== authorId) throw new HttpError(403, 'Vous n\'êtes pas l\'auteur de cet avis');

    const cutoff = new Date(review.createdAt.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    if (new Date() > cutoff) {
      throw new HttpError(400, 'La fenêtre de suppression de 7 jours est écoulée');
    }

    const propertyId = review.propertyId;
    await prisma.review.delete({ where: { id: reviewId } });
    await recalculatePropertyRating(propertyId);
  },

  async getForProperty(propertyId: string, query: { page?: string; limit?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = Math.min(parseInt(query.limit ?? '20'), 50);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { propertyId, status: 'published' },
        include: {
          author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { publishedAt: 'desc' },
      }),
      prisma.review.count({ where: { propertyId, status: 'published' } }),
    ]);

    return { reviews, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async listMine(authorId: string, query: { page?: string }) {
    const page = parseInt(query.page ?? '1');
    const limit = 20;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { authorId },
        include: {
          property: { select: { id: true, title: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where: { authorId } }),
    ]);

    const now = new Date();
    return {
      reviews: reviews.map((r) => ({
        ...r,
        canEdit: now < new Date(r.createdAt.getTime() + EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000),
      })),
      total,
      page,
      limit,
    };
  },

  async addOwnerReply(reviewId: string, userId: string, reply: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: { property: true },
    });
    if (!review) throw new HttpError(404, 'Avis introuvable');
    if (review.property.ownerId !== userId) throw new HttpError(403, 'Vous n\'êtes pas le propriétaire de cette annonce');
    if (review.status !== 'published') throw new HttpError(400, 'Impossible de répondre à un avis non publié');

    return prisma.review.update({
      where: { id: reviewId },
      data: { responseFromProfessional: reply },
    });
  },
};
