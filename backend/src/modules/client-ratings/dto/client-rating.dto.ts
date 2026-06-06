// Zod DTOs for client rating endpoints
import { z } from 'zod';

const criteriaRating = z.number().int().min(1).max(5);

export const CreateClientRatingDto = z.object({
  bookingId: z.string().cuid(),
  respectRating: criteriaRating,
  communicationRating: criteriaRating,
  punctualityRating: criteriaRating,
  rulesRating: criteriaRating,
  comment: z.string().min(5).max(1000).optional(),
  isPublic: z.boolean().default(true),
});
export type CreateClientRatingInput = z.infer<typeof CreateClientRatingDto>;

export const ReportClientRatingDto = z.object({
  reason: z.string().min(10).max(500),
});
export type ReportClientRatingInput = z.infer<typeof ReportClientRatingDto>;
