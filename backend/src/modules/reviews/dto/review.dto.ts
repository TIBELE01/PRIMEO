// Zod DTOs for review endpoints
import { z } from 'zod';

const criteriaRating = z.number().int().min(1).max(5);

export const CreateReviewDto = z.object({
  bookingId: z.string().cuid(),
  rating: criteriaRating,
  cleanlinessRating: criteriaRating.optional(),
  communicationRating: criteriaRating.optional(),
  accuracyRating: criteriaRating.optional(),
  locationRating: criteriaRating.optional(),
  valueRating: criteriaRating.optional(),
  cuisineRating:   criteriaRating.optional(),
  serviceRating:   criteriaRating.optional(),
  ambianceRating:  criteriaRating.optional(),
  comment: z.string().min(10).max(2000).optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewDto>;

export const UpdateReviewDto = z.object({
  rating: criteriaRating.optional(),
  cleanlinessRating: criteriaRating.optional(),
  communicationRating: criteriaRating.optional(),
  accuracyRating: criteriaRating.optional(),
  locationRating: criteriaRating.optional(),
  valueRating: criteriaRating.optional(),
  cuisineRating:   criteriaRating.optional(),
  serviceRating:   criteriaRating.optional(),
  ambianceRating:  criteriaRating.optional(),
  comment: z.string().min(10).max(2000).optional(),
});
export type UpdateReviewInput = z.infer<typeof UpdateReviewDto>;

export const ReviewReplyDto = z.object({
  reply: z.string().min(5).max(1000),
});
