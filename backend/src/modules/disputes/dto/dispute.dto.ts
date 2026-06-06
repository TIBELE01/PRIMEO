// Zod DTOs for dispute endpoints
import { z } from 'zod';

export const CreateDisputeDto = z.object({
  bookingId: z.string().cuid(),
  reason: z.enum(['non_conformity', 'payment_issue', 'cancellation', 'no_show', 'other']),
  description: z.string().min(20).max(1000),
});
export type CreateDisputeInput = z.infer<typeof CreateDisputeDto>;
